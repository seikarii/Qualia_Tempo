use ruff_macros::RulePack;
use ruff_diagnostics::{Diagnostic, Violation};
use ruff_python_ast::{self as ast, visitor::Visitor};
use ruff_source_file::SourceFile;
use ruff_text_size::TextRange;
use std::path::Path;

/// Rules pack for QUALIA.CODE architectural enforcement
#[derive(RulePack)]
#[pack(
    rules = [
        QLA001,
        QLA002,
        QLA003
    ]
)]
pub struct QualiaCode;

/// QLA001: Prohibit Direct Service Instantiation
#[derive(Debug)]
pub struct QLA001;

impl ruff_macros::Rule for QLA001 {
    const CODE: &'static str = "QLA001";
    const MESSAGE: &'static str = "Direct instantiation of service classes is prohibited. Services must be resolved through dependency injection via CompositionRoot.";

    fn check(
        &self,
        node: &ast::Stmt,
        source_file: &SourceFile,
    ) -> Option<Diagnostic> {
        let mut checker = QLA001Checker::new(source_file.path());
        checker.visit_stmt(node);
        checker.diagnostic
    }
}

struct QLA001Checker<'a> {
    filepath: &'a Path,
    service_classes: std::collections::HashSet<String>,
    is_composition_root: bool,
    diagnostic: Option<Diagnostic>,
}

impl<'a> QLA001Checker<'a> {
    fn new(filepath: &'a Path) -> Self {
        let service_directories = vec!["services/".to_string()];
        let composition_root_files = vec!["CompositionRoot.py".to_string()];

        let is_composition_root = composition_root_files.iter()
            .any(|comp_root| filepath.to_string_lossy().contains(comp_root));

        Self {
            filepath,
            service_classes: std::collections::HashSet::new(),
            is_composition_root,
            diagnostic: None,
        }
    }
}

impl<'a> Visitor for QLA001Checker<'a> {
    fn visit_stmt(&mut self, stmt: &ast::Stmt) {
        // First pass: identify service classes from imports
        if let ast::Stmt::ImportFrom(ref import_from) = stmt {
            if let Some(ref module) = import_from.module {
                let module_str = module.as_str();
                if module_str.contains("services") {
                    for alias in &import_from.names {
                        let name = alias.name.as_str();
                        if name.chars().next().map_or(false, |c| c.is_uppercase())
                            && (name.contains("Service") || name.contains("Engine") || name.contains("Manager") || name.contains("Processor") || name.contains("Handler")) {
                            self.service_classes.insert(name.to_string());
                        }
                    }
                }
            }
        }

        // Also check class definitions in service directories
        if let ast::Stmt::ClassDef(ref class_def) = stmt {
            let filepath_str = self.filepath.to_string_lossy();
            let in_service_dir = filepath_str.contains("services");
            if in_service_dir && (class_def.name.contains("Service") || class_def.name.contains("Engine") || class_def.name.contains("Manager")) {
                self.service_classes.insert(class_def.name.to_string());
            }
        }

        // Second pass: check for instantiations
        if let ast::Stmt::Expr(ref expr) = stmt {
            if let ast::Expr::Call(ref call) = &expr.value {
                self.check_call(call, stmt.range());
            }
        }

        // Continue visiting
        ast::visitor::walk_stmt(self, stmt);
    }
}

impl<'a> QLA001Checker<'a> {
    fn check_call(&mut self, call: &ast::ExprCall, range: TextRange) {
        if self.is_composition_root {
            return;
        }

        // Direct call: ServiceClass()
        if let ast::Expr::Name(ref name) = &call.func {
            let class_name = name.id.as_str();
            if self.service_classes.contains(class_name) {
                self.diagnostic = Some(Diagnostic::new(
                    QLA001,
                    range,
                    format!("Direct instantiation of '{}' is prohibited. Services must be resolved through dependency injection via CompositionRoot.", class_name)
                ));
            }
        }

        // Attribute call: module.ServiceClass()
        if let ast::Expr::Attribute(ref attr) = &call.func {
            if let ast::Expr::Name(ref value_name) = &attr.value {
                let class_name = attr.attr.as_str();
                if self.service_classes.contains(class_name) {
                    self.diagnostic = Some(Diagnostic::new(
                        QLA001,
                        range,
                        format!("Direct instantiation of '{}' is prohibited. Services must be resolved through dependency injection via CompositionRoot.", class_name)
                    ));
                }
            }
        }
    }
}

/// QLA002: Enforce Service Method Decorators
#[derive(Debug)]
pub struct QLA002;

impl ruff_macros::Rule for QLA002 {
    const CODE: &'static str = "QLA002";
    const MESSAGE: &'static str = "Public methods in service classes must use required architectural decorators.";

    fn check(
        &self,
        node: &ast::Stmt,
        source_file: &SourceFile,
    ) -> Option<Diagnostic> {
        let mut checker = QLA002Checker::new(source_file.path());
        checker.visit_stmt(node);
        checker.diagnostic
    }
}

struct QLA002Checker<'a> {
    filepath: &'a Path,
    is_service_file: bool,
    current_class: Option<String>,
    in_service_class: bool,
    diagnostic: Option<Diagnostic>,
}

impl<'a> QLA002Checker<'a> {
    fn new(filepath: &'a Path) -> Self {
        let service_directories = vec!["services/".to_string()];
        let is_service_file = service_directories.iter()
            .any(|dir| filepath.to_string_lossy().contains(dir));

        Self {
            filepath,
            is_service_file,
            current_class: None,
            in_service_class: false,
            diagnostic: None,
        }
    }
}

impl<'a> Visitor for QLA002Checker<'a> {
    fn visit_stmt(&mut self, stmt: &ast::Stmt) {
        if !self.is_service_file {
            return;
        }

        if let ast::Stmt::ClassDef(ref class_def) = stmt {
            let old_class = self.current_class.clone();
            let old_in_service = self.in_service_class;

            self.current_class = Some(class_def.name.to_string());
            self.in_service_class = class_def.name.contains("Service")
                || class_def.name.contains("Engine")
                || class_def.name.contains("Manager")
                || class_def.name.contains("Processor")
                || class_def.name.contains("Handler");

            ast::visitor::walk_stmt(self, stmt);

            self.current_class = old_class;
            self.in_service_class = old_in_service;
        } else if let ast::Stmt::FunctionDef(ref func_def) = stmt {
            if self.in_service_class && !func_def.name.starts_with('_') && func_def.name != "__init__" {
                // Skip property methods
                let is_property = func_def.decorator_list.iter().any(|decorator| {
                    matches!(decorator, ast::Decorator::Name(name) if name.id == "property")
                });

                if !is_property {
                    let has_decorator = func_def.decorator_list.iter().any(|decorator| {
                        match decorator {
                            ast::Decorator::Name(ref name) => {
                                let decorator_name = name.id.as_str();
                                decorator_name == "log_execution"
                                    || decorator_name == "handle_errors"
                                    || decorator_name == "validate_schema"
                                    || decorator_name == "log_method"
                                    || decorator_name == "catch_error"
                                    || decorator_name == "throttle"
                                    || decorator_name == "validate"
                            }
                            ast::Decorator::Call(ref call) => {
                                if let ast::Expr::Name(ref name) = &call.func {
                                    let decorator_name = name.id.as_str();
                                    decorator_name == "log_execution"
                                        || decorator_name == "handle_errors"
                                        || decorator_name == "validate_schema"
                                        || decorator_name == "log_method"
                                        || decorator_name == "catch_error"
                                        || decorator_name == "throttle"
                                        || decorator_name == "validate"
                                } else {
                                    false
                                }
                            }
                            _ => false,
                        }
                    });

                    if !has_decorator {
                        self.diagnostic = Some(Diagnostic::new(
                            QLA002,
                            stmt.range(),
                            format!("Public method '{}' in service class must use at least one architectural decorator (@log_execution, @handle_errors, @validate_schema, @log_method, @catch_error, @throttle, or @validate).", func_def.name)
                        ));
                    }
                }
            }
        }

        ast::visitor::walk_stmt(self, stmt);
    }
}

/// QLA003: Forbid Concrete Route Dependencies
#[derive(Debug)]
pub struct QLA003;

impl ruff_macros::Rule for QLA003 {
    const CODE: &'static str = "QLA003";
    const MESSAGE: &'static str = "FastAPI routes must use abstract dependencies (interfaces) rather than concrete implementations.";

    fn check(
        &self,
        node: &ast::Stmt,
        source_file: &SourceFile,
    ) -> Option<Diagnostic> {
        let mut checker = QLA003Checker::new(source_file.path());
        checker.visit_stmt(node);
        checker.diagnostic
    }
}

struct QLA003Checker<'a> {
    filepath: &'a Path,
    is_api_file: bool,
    has_fastapi: bool,
    depends_imported: bool,
    concrete_classes: std::collections::HashSet<String>,
    interface_classes: std::collections::HashSet<String>,
    diagnostic: Option<Diagnostic>,
}

impl<'a> QLA003Checker<'a> {
    fn new(filepath: &'a Path) -> Self {
        let filepath_str = filepath.to_string_lossy();
        let is_api_file = filepath_str.contains("api")
            || filepath_str.contains("route")
            || filepath_str.contains("endpoint");

        Self {
            filepath,
            is_api_file,
            has_fastapi: false,
            depends_imported: false,
            concrete_classes: std::collections::HashSet::new(),
            interface_classes: std::collections::HashSet::new(),
            diagnostic: None,
        }
    }
}

impl<'a> Visitor for QLA003Checker<'a> {
    fn visit_stmt(&mut self, stmt: &ast::Stmt) {
        if !self.is_api_file {
            return;
        }

        // Identify imports
        if let ast::Stmt::ImportFrom(ref import_from) = stmt {
            if let Some(ref module) = import_from.module {
                let module_str = module.as_str();
                if module_str.to_lowercase().contains("fastapi") {
                    self.has_fastapi = true;
                    for alias in &import_from.names {
                        if alias.name == "Depends" {
                            self.depends_imported = true;
                        }
                    }
                }

                if module_str.contains("services") {
                    for alias in &import_from.names {
                        let class_name = alias.name.as_str();
                        if class_name.chars().next().map_or(false, |c| c.is_uppercase()) {
                            if class_name.starts_with('I') && class_name.chars().nth(1).map_or(false, |c| c.is_uppercase()) {
                                self.interface_classes.insert(class_name.to_string());
                            } else if class_name.contains("Service") || class_name.contains("Engine") || class_name.contains("Manager") {
                                self.concrete_classes.insert(class_name.to_string());
                            }
                        }
                    }
                }
            }
        }

        // Only proceed if FastAPI is detected
        if !self.has_fastapi && !self.depends_imported {
            return;
        }

        // Check function definitions for route handlers
        if let ast::Stmt::FunctionDef(ref func_def) = stmt {
            let is_route_handler = func_def.decorator_list.iter().any(|decorator| {
                match decorator {
                    ast::Decorator::Name(ref name) => {
                        let decorator_name = name.id.as_str();
                        matches!(decorator_name, "get" | "post" | "put" | "delete" | "patch")
                    }
                    ast::Decorator::Call(ref call) => {
                        if let ast::Expr::Name(ref name) = &call.func {
                            let decorator_name = name.id.as_str();
                            matches!(decorator_name, "get" | "post" | "put" | "delete" | "patch")
                        } else if let ast::Expr::Attribute(ref attr) = &call.func {
                            let attr_name = attr.attr.as_str();
                            matches!(attr_name, "get" | "post" | "put" | "delete" | "patch")
                        } else {
                            false
                        }
                    }
                    ast::Decorator::Attribute(ref attr) => {
                        let attr_name = attr.attr.as_str();
                        matches!(attr_name, "get" | "post" | "put" | "delete" | "patch")
                    }
                    _ => false,
                }
            });

            if is_route_handler {
                for arg in &func_def.args.args {
                    if let Some(ref annotation) = &arg.annotation {
                        self.check_dependency_annotation(arg, annotation, stmt.range());
                    }
                }
            }
        }

        ast::visitor::walk_stmt(self, stmt);
    }
}

impl<'a> QLA003Checker<'a> {
    fn check_dependency_annotation(&mut self, arg: &ast::Arg, annotation: &ast::Expr, range: TextRange) {
        // Check Depends() calls
        if let ast::Expr::Call(ref call) = annotation {
            if let ast::Expr::Name(ref name) = &call.func {
                if name.id.as_str() == "Depends" {
                    if let Some(first_arg) = call.args.first() {
                        self.check_depends_argument(arg, first_arg, range);
                    }
                }
            }
        }

        // Check direct type annotations
        if let ast::Expr::Name(ref name) = annotation {
            let class_name = name.id.as_str();
            if self.concrete_classes.contains(class_name) {
                self.diagnostic = Some(Diagnostic::new(
                    QLA003,
                    range,
                    format!("Route parameter '{}' uses concrete type '{}'. Use abstract interface instead to maintain loose coupling.", arg.arg, class_name)
                ));
            }
        }
    }

    fn check_depends_argument(&mut self, param: &ast::Arg, dependency_arg: &ast::Expr, range: TextRange) {
        if let ast::Expr::Name(ref dep_name) = dependency_arg {
            let dep_class = dep_name.id.as_str();
            if self.concrete_classes.contains(dep_class) {
                self.diagnostic = Some(Diagnostic::new(
                    QLA003,
                    range,
                    format!("Route parameter '{}' uses Depends() with concrete class '{}'. Use abstract interface instead to maintain loose coupling.", param.arg, dep_class)
                ));
            }
        } else if let ast::Expr::Attribute(ref attr) = dependency_arg {
            let attr_name = attr.attr.as_str();
            if self.concrete_classes.contains(attr_name) {
                self.diagnostic = Some(Diagnostic::new(
                    QLA003,
                    range,
                    format!("Route parameter '{}' uses Depends() with concrete class '{}'. Use abstract interface instead to maintain loose coupling.", param.arg, attr_name)
                ));
            }
        }
    }
}
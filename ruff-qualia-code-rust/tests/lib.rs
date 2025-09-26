#[cfg(test)]
mod tests {
    use super::*;
    use ruff_python_parser::parse_module;
    use ruff_source_file::SourceFile;
    use std::path::Path;

    fn create_source_file(content: &str, path: &str) -> SourceFile {
        SourceFile::new(path, content)
    }

    #[test]
    fn test_qla001_direct_instantiation() {
        let code = r#"
from services import MyService

# This should trigger QLA001
service = MyService()
"#;
        let source_file = create_source_file(code, "test.py");
        let rule = QLA001;

        // Parse the code
        let parsed = parse_module(code).unwrap();
        let mut violations = Vec::new();

        for stmt in &parsed.body {
            if let Some(diagnostic) = rule.check(stmt, &source_file) {
                violations.push(diagnostic);
            }
        }

        assert_eq!(violations.len(), 1);
        assert!(violations[0].message().contains("Direct instantiation"));
    }

    #[test]
    fn test_qla001_composition_root_allowed() {
        let code = r#"
from services import MyService

# This should NOT trigger QLA001 in CompositionRoot
service = MyService()
"#;
        let source_file = create_source_file(code, "CompositionRoot.py");
        let rule = QLA001;

        let parsed = parse_module(code).unwrap();
        let mut violations = Vec::new();

        for stmt in &parsed.body {
            if let Some(diagnostic) = rule.check(stmt, &source_file) {
                violations.push(diagnostic);
            }
        }

        assert_eq!(violations.len(), 0);
    }

    #[test]
    fn test_qla002_missing_decorator() {
        let code = r#"
class MyService:
    def public_method(self):
        pass
"#;
        let source_file = create_source_file(code, "services/MyService.py");
        let rule = QLA002;

        let parsed = parse_module(code).unwrap();
        let mut violations = Vec::new();

        for stmt in &parsed.body {
            if let Some(diagnostic) = rule.check(stmt, &source_file) {
                violations.push(diagnostic);
            }
        }

        assert_eq!(violations.len(), 1);
        assert!(violations[0].message().contains("architectural decorator"));
    }

    #[test]
    fn test_qla002_with_decorator() {
        let code = r#"
class MyService:
    @log_method
    def public_method(self):
        pass
"#;
        let source_file = create_source_file(code, "services/MyService.py");
        let rule = QLA002;

        let parsed = parse_module(code).unwrap();
        let mut violations = Vec::new();

        for stmt in &parsed.body {
            if let Some(diagnostic) = rule.check(stmt, &source_file) {
                violations.push(diagnostic);
            }
        }

        assert_eq!(violations.len(), 0);
    }

    #[test]
    fn test_qla003_concrete_dependency() {
        let code = r#"
from fastapi import Depends
from services import MyService

@app.get("/")
def route_handler(service: MyService = Depends(MyService)):
    pass
"#;
        let source_file = create_source_file(code, "api/routes.py");
        let rule = QLA003;

        let parsed = parse_module(code).unwrap();
        let mut violations = Vec::new();

        for stmt in &parsed.body {
            if let Some(diagnostic) = rule.check(stmt, &source_file) {
                violations.push(diagnostic);
            }
        }

        assert_eq!(violations.len(), 1);
        assert!(violations[0].message().contains("concrete class"));
    }
}
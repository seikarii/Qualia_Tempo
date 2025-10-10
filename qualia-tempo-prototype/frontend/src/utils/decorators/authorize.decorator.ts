/**
 * @authorize Decorator
 * 
 * Role-Based Access Control (RBAC) decorator for TypeScript methods.
 * Enforces authorization checks before method execution.
 * 
 * QUALIA.CODE v1.1: Security Pattern - Method-level authorization
 * Session 30: Frontend implementation (backend counterpart in Session 29)
 * 
 * @example
 * ```typescript
 * class AdminService {
 *   @authorize({ roles: ['admin', 'moderator'] })
 *   public deleteContent(contentId: string, user: UserContext): void {
 *     this.contentRepo.delete(contentId);
 *   }
 * 
 *   @authorize({ permissions: ['read', 'write'] })
 *   public async updateDocument(docId: string, data: any, user: UserContext): Promise<void> {
 *     await this.docService.update(docId, data);
 *   }
 * }
 * ```
 * 
 * INFRASTRUCTURE STATUS:
 * - Current: Parameter-based auth context (user object in method params)
 * - Future: Integration with SecurityService when available
 * - Design: Infrastructure-ready, no breaking changes when SecurityService added
 */

/**
 * User context interface expected by @authorize decorator
 */
export interface UserContext {
  /** User identifier */
  id?: string;
  /** List of user roles (OR logic - any role grants access) */
  roles?: string[];
  /** List of user permissions (AND logic - all required) */
  permissions?: string[];
  /** Additional user metadata */
  [key: string]: any;
}

/**
 * Authorization configuration options
 */
export interface AuthorizeOptions {
  /**
   * Required roles (OR logic - user must have at least one)
   * @example ['admin', 'moderator', 'editor']
   */
  roles?: string[];
  
  /**
   * Required permissions (AND logic - user must have all)
   * @example ['read', 'write', 'delete']
   */
  permissions?: string[];
  
  /**
   * Custom authorization predicate function
   * @param user - User context object
   * @returns true if authorized, false otherwise
   */
  customCheck?: (user: UserContext) => boolean;
  
  /**
   * Parameter name containing user context (default: 'user')
   * @example 'currentUser', 'authContext', 'session'
   */
  userParamName?: string;
}

/**
 * Authorization error thrown when user lacks required roles/permissions
 */
export class UnauthorizedError extends Error {
  public readonly user?: UserContext;
  public readonly requiredRoles?: string[];
  public readonly requiredPermissions?: string[];
  
  constructor(
    message: string,
    user?: UserContext,
    requiredRoles?: string[],
    requiredPermissions?: string[]
  ) {
    super(message);
    this.name = 'UnauthorizedError';
    this.user = user;
    this.requiredRoles = requiredRoles;
    this.requiredPermissions = requiredPermissions;
    
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }
}

/**
 * @authorize Decorator
 * 
 * Enforces role-based or permission-based authorization before method execution.
 * Extracts user context from method parameters and validates against requirements.
 * 
 * Authorization Logic:
 * - **Roles:** OR logic - user must have AT LEAST ONE of the specified roles
 * - **Permissions:** AND logic - user must have ALL specified permissions
 * - **Custom Check:** If provided, executed after role/permission checks
 * 
 * User Context Extraction:
 * - Searches method parameters for user context object
 * - Default parameter name: 'user' (configurable via userParamName option)
 * - User object must implement UserContext interface
 * 
 * Error Handling:
 * - Throws UnauthorizedError if authorization fails
 * - Error includes user context, required roles/permissions for debugging
 * - Production systems should catch and log UnauthorizedError appropriately
 * 
 * @param options - Authorization configuration
 * @returns Method decorator
 * 
 * @throws {UnauthorizedError} When user lacks required authorization
 * @throws {Error} When user context not found in method parameters
 * 
 * @example Role-based authorization (OR logic)
 * ```typescript
 * @authorize({ roles: ['admin', 'moderator'] })
 * public deleteUser(userId: string, user: UserContext): void {
 *   // User must be 'admin' OR 'moderator'
 *   this.userRepo.delete(userId);
 * }
 * ```
 * 
 * @example Permission-based authorization (AND logic)
 * ```typescript
 * @authorize({ permissions: ['read', 'write', 'delete'] })
 * public modifyContent(id: string, data: any, user: UserContext): void {
 *   // User must have 'read' AND 'write' AND 'delete' permissions
 *   this.contentService.modify(id, data);
 * }
 * ```
 * 
 * @example Combined role + permission authorization
 * ```typescript
 * @authorize({ 
 *   roles: ['admin'], 
 *   permissions: ['system.config'] 
 * })
 * public updateSystemConfig(config: any, user: UserContext): void {
 *   // User must be 'admin' AND have 'system.config' permission
 *   this.configService.update(config);
 * }
 * ```
 * 
 * @example Custom authorization check
 * ```typescript
 * @authorize({ 
 *   customCheck: (user) => user.id === 'specific-admin-id'
 * })
 * public criticalOperation(user: UserContext): void {
 *   // Custom logic for authorization
 *   this.performCriticalAction();
 * }
 * ```
 * 
 * @example Custom user parameter name
 * ```typescript
 * @authorize({ 
 *   roles: ['admin'], 
 *   userParamName: 'currentUser' 
 * })
 * public privilegedAction(data: any, currentUser: UserContext): void {
 *   // User context extracted from 'currentUser' parameter
 *   this.execute(data);
 * }
 * ```
 */
export function authorize(options: AuthorizeOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const userParamName = options.userParamName || 'user';
    
    descriptor.value = function (this: any, ...args: any[]): any {
      // Extract parameter names from function signature
      const paramNames = getParameterNames(originalMethod);
      
      // Find user context in method arguments
      const userIndex = paramNames.indexOf(userParamName);
      
      if (userIndex === -1) {
        throw new Error(
          `@authorize decorator error: User context parameter '${userParamName}' not found in method '${propertyKey}'. ` +
          `Available parameters: ${paramNames.join(', ')}. ` +
          `Ensure method signature includes '${userParamName}: UserContext' parameter.`
        );
      }
      
      const user: UserContext | undefined = args[userIndex];
      
      if (!user) {
        throw new UnauthorizedError(
          `@authorize decorator error: User context is null/undefined in method '${propertyKey}'. ` +
          `Authorization check cannot proceed without user context.`,
          user,
          options.roles,
          options.permissions
        );
      }
      
      // Validate role requirements (OR logic)
      if (options.roles && options.roles.length > 0) {
        const userRoles = user.roles || [];
        const hasRequiredRole = options.roles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
          throw new UnauthorizedError(
            `@authorize: User lacks required role. User roles: [${userRoles.join(', ')}], ` +
            `Required roles (any): [${options.roles.join(', ')}]`,
            user,
            options.roles,
            options.permissions
          );
        }
      }
      
      // Validate permission requirements (AND logic)
      if (options.permissions && options.permissions.length > 0) {
        const userPermissions = user.permissions || [];
        const missingPermissions = options.permissions.filter(
          perm => !userPermissions.includes(perm)
        );
        
        if (missingPermissions.length > 0) {
          throw new UnauthorizedError(
            `@authorize: User lacks required permissions. User permissions: [${userPermissions.join(', ')}], ` +
            `Required permissions (all): [${options.permissions.join(', ')}], ` +
            `Missing: [${missingPermissions.join(', ')}]`,
            user,
            options.roles,
            options.permissions
          );
        }
      }
      
      // Execute custom authorization check
      if (options.customCheck) {
        const isAuthorized = options.customCheck(user);
        if (!isAuthorized) {
          throw new UnauthorizedError(
            `@authorize: Custom authorization check failed for method '${propertyKey}'`,
            user,
            options.roles,
            options.permissions
          );
        }
      }
      
      // Authorization successful - proceed with method execution
      return originalMethod.apply(this, args);
    };
    
    // Attach authorization metadata to method for introspection
    (descriptor.value as any).__authorized__ = true;
    (descriptor.value as any).__requiredRoles__ = options.roles;
    (descriptor.value as any).__requiredPermissions__ = options.permissions;
    
    return descriptor;
  };
}

/**
 * Extracts parameter names from function signature
 * Uses regex parsing to extract named parameters
 * 
 * @param fn - Function to extract parameter names from
 * @returns Array of parameter names
 */
function getParameterNames(fn: Function): string[] {
  const fnStr = fn.toString();
  
  // Match function parameters (handles arrow functions, regular functions, async functions)
  const match = fnStr.match(/(?:function\s*\w*\s*)?\(([^)]*)\)/) || 
                fnStr.match(/(\w+)\s*=>/);
  
  if (!match || !match[1]) {
    return [];
  }
  
  // Split parameters and clean whitespace/defaults
  return match[1]
    .split(',')
    .map(param => param.trim().split(/[=:]/, 1)[0].trim())
    .filter(param => param.length > 0);
}

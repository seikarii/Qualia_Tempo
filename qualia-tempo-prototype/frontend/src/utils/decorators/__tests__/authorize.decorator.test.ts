/**
 * @authorize Decorator Test Suite
 * 
 * Comprehensive tests for RBAC authorization decorator
 * QUALIA.CODE v1.1: Security Pattern Testing
 * Session 30: Frontend implementation tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { authorize, UnauthorizedError, UserContext, AuthorizeOptions } from '../authorize.decorator';

// Test service class with authorization
class SecureService {
  @authorize({ roles: ['admin'] })
  public deleteResource(resourceId: string, user: UserContext): void {
    // Method implementation
  }
  
  @authorize({ roles: ['admin', 'moderator'] })
  public moderateContent(contentId: string, user: UserContext): void {
    // Method implementation
  }
  
  @authorize({ permissions: ['read', 'write'] })
  public updateDocument(docId: string, data: any, user: UserContext): void {
    // Method implementation
  }
  
  @authorize({ roles: ['admin'], permissions: ['system.config'] })
  public updateSystemConfig(config: any, user: UserContext): void {
    // Method implementation
  }
  
  @authorize({ customCheck: (user) => user.id === 'super-admin' })
  public criticalOperation(user: UserContext): void {
    // Method implementation
  }
  
  @authorize({ roles: ['user'], userParamName: 'currentUser' })
  public publicMethod(data: any, currentUser: UserContext): void {
    // Method implementation with custom user param name
  }
}

describe('@authorize Decorator', () => {
  let service: SecureService;
  
  beforeEach(() => {
    service = new SecureService();
  });
  
  describe('Role-based Authorization', () => {
    it('should allow access when user has required role', () => {
      const user: UserContext = {
        id: 'user1',
        roles: ['admin'],
      };
      
      expect(() => service.deleteResource('res-123', user)).not.toThrow();
    });
    
    it('should allow access when user has one of multiple required roles (OR logic)', () => {
      const moderatorUser: UserContext = {
        id: 'user2',
        roles: ['moderator'],
      };
      
      const adminUser: UserContext = {
        id: 'user3',
        roles: ['admin'],
      };
      
      expect(() => service.moderateContent('content-456', moderatorUser)).not.toThrow();
      expect(() => service.moderateContent('content-456', adminUser)).not.toThrow();
    });
    
    it('should deny access when user lacks required role', () => {
      const user: UserContext = {
        id: 'user4',
        roles: ['user', 'viewer'],
      };
      
      expect(() => service.deleteResource('res-123', user))
        .toThrow(UnauthorizedError);
    });
    
    it('should deny access when user has no roles', () => {
      const user: UserContext = {
        id: 'user5',
        roles: [],
      };
      
      expect(() => service.deleteResource('res-123', user))
        .toThrow(UnauthorizedError);
    });
    
    it('should deny access when roles property is undefined', () => {
      const user: UserContext = {
        id: 'user6',
      };
      
      expect(() => service.deleteResource('res-123', user))
        .toThrow(UnauthorizedError);
    });
  });
  
  describe('Permission-based Authorization', () => {
    it('should allow access when user has all required permissions (AND logic)', () => {
      const user: UserContext = {
        id: 'user7',
        permissions: ['read', 'write', 'delete'],
      };
      
      expect(() => service.updateDocument('doc-789', { title: 'New Title' }, user))
        .not.toThrow();
    });
    
    it('should deny access when user lacks one required permission', () => {
      const user: UserContext = {
        id: 'user8',
        permissions: ['read'],  // Missing 'write'
      };
      
      expect(() => service.updateDocument('doc-789', { title: 'New Title' }, user))
        .toThrow(UnauthorizedError);
    });
    
    it('should deny access when user has no permissions', () => {
      const user: UserContext = {
        id: 'user9',
        permissions: [],
      };
      
      expect(() => service.updateDocument('doc-789', { title: 'New Title' }, user))
        .toThrow(UnauthorizedError);
    });
    
    it('should deny access when permissions property is undefined', () => {
      const user: UserContext = {
        id: 'user10',
      };
      
      expect(() => service.updateDocument('doc-789', { title: 'New Title' }, user))
        .toThrow(UnauthorizedError);
    });
  });
  
  describe('Combined Role and Permission Authorization', () => {
    it('should allow access when user has both required role and permissions', () => {
      const user: UserContext = {
        id: 'user11',
        roles: ['admin'],
        permissions: ['system.config'],
      };
      
      expect(() => service.updateSystemConfig({ debug: true }, user))
        .not.toThrow();
    });
    
    it('should deny access when user has role but lacks permission', () => {
      const user: UserContext = {
        id: 'user12',
        roles: ['admin'],
        permissions: ['read', 'write'],  // Missing 'system.config'
      };
      
      expect(() => service.updateSystemConfig({ debug: true }, user))
        .toThrow(UnauthorizedError);
    });
    
    it('should deny access when user has permission but lacks role', () => {
      const user: UserContext = {
        id: 'user13',
        roles: ['user'],  // Not 'admin'
        permissions: ['system.config'],
      };
      
      expect(() => service.updateSystemConfig({ debug: true }, user))
        .toThrow(UnauthorizedError);
    });
  });
  
  describe('Custom Authorization Check', () => {
    it('should allow access when custom check returns true', () => {
      const user: UserContext = {
        id: 'super-admin',
        roles: ['user'],
      };
      
      expect(() => service.criticalOperation(user)).not.toThrow();
    });
    
    it('should deny access when custom check returns false', () => {
      const user: UserContext = {
        id: 'regular-user',
        roles: ['admin'],
      };
      
      expect(() => service.criticalOperation(user))
        .toThrow(UnauthorizedError);
    });
  });
  
  describe('User Context Handling', () => {
    it('should throw error when user context is null', () => {
      expect(() => service.deleteResource('res-123', null as any))
        .toThrow(UnauthorizedError);
    });
    
    it('should throw error when user context is undefined', () => {
      expect(() => service.deleteResource('res-123', undefined as any))
        .toThrow(UnauthorizedError);
    });
    
    it('should throw error when user parameter not found in method signature', () => {
      // This tests the parameter name extraction logic
      class InvalidService {
        @authorize({ roles: ['admin'] })
        public brokenMethod(data: any): void {
          // Missing user parameter
        }
      }
      
      const invalidService = new InvalidService();
      expect(() => (invalidService as any).brokenMethod({}))
        .toThrow(/User context parameter 'user' not found/);
    });
  });
  
  describe('Custom User Parameter Name', () => {
    it('should extract user context from custom parameter name', () => {
      const user: UserContext = {
        id: 'user14',
        roles: ['user'],
      };
      
      expect(() => service.publicMethod({ data: 'test' }, user))
        .not.toThrow();
    });
    
    it('should deny access when custom parameter user lacks role', () => {
      const user: UserContext = {
        id: 'user15',
        roles: ['guest'],  // Not 'user'
      };
      
      expect(() => service.publicMethod({ data: 'test' }, user))
        .toThrow(UnauthorizedError);
    });
  });
  
  describe('Error Message Quality', () => {
    it('should provide detailed error message for missing roles', () => {
      const user: UserContext = {
        id: 'user16',
        roles: ['viewer', 'guest'],
      };
      
      try {
        service.deleteResource('res-123', user);
        expect.fail('Should have thrown UnauthorizedError');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toContain('User roles: [viewer, guest]');
        expect((error as UnauthorizedError).message).toContain('Required roles (any): [admin]');
      }
    });
    
    it('should provide detailed error message for missing permissions', () => {
      const user: UserContext = {
        id: 'user17',
        permissions: ['read'],
      };
      
      try {
        service.updateDocument('doc-789', {}, user);
        expect.fail('Should have thrown UnauthorizedError');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect((error as UnauthorizedError).message).toContain('User permissions: [read]');
        expect((error as UnauthorizedError).message).toContain('Required permissions (all): [read, write]');
        expect((error as UnauthorizedError).message).toContain('Missing: [write]');
      }
    });
    
    it('should include user context in UnauthorizedError', () => {
      const user: UserContext = {
        id: 'user18',
        roles: ['guest'],
      };
      
      try {
        service.deleteResource('res-123', user);
        expect.fail('Should have thrown UnauthorizedError');
      } catch (error) {
        const authError = error as UnauthorizedError;
        expect(authError.user).toEqual(user);
        expect(authError.requiredRoles).toEqual(['admin']);
      }
    });
  });
  
  describe('Metadata Attachment', () => {
    it('should attach authorization metadata to method', () => {
      const metadata = (service.deleteResource as any);
      
      expect(metadata.__authorized__).toBe(true);
      expect(metadata.__requiredRoles__).toEqual(['admin']);
    });
    
    it('should attach permission metadata to method', () => {
      const metadata = (service.updateDocument as any);
      
      expect(metadata.__authorized__).toBe(true);
      expect(metadata.__requiredPermissions__).toEqual(['read', 'write']);
    });
  });
});

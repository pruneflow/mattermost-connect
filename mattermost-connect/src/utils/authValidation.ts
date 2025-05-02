// src/utils/authValidation.ts
/**
 * Authentication validation utilities
 * Provides validation functions for authentication-related data
 */
import * as yup from "yup";
import { passwordStrength } from "check-password-strength";

/**
 * Validation rules configuration
 */
export interface ValidationRules {
  /** Minimum username length */
  minUsernameLength: number;
  /** Maximum username length */
  maxUsernameLength: number;
  /** Username pattern (for allowed characters) */
  usernamePattern: RegExp;
  /** Username pattern error message */
  usernamePatternError: string;
  /** Minimum password length */
  minPasswordLength: number;
  /** Maximum password length */
  maxPasswordLength: number;
  /** Whether to enforce password strength */
  enforcePasswordStrength: boolean;
  /** Minimum password strength (0-3) */
  minPasswordStrength: number;
  /** Email pattern (for validation beyond standard) */
  emailPattern?: RegExp;
  /** Email pattern error message */
  emailPatternError?: string;
}

/**
 * Default validation rules
 */
export const defaultValidationRules: ValidationRules = {
  minUsernameLength: 3,
  maxUsernameLength: 22,
  usernamePattern: /^[a-zA-Z0-9\.\-\_]{3,22}$/,
  usernamePatternError:
    "Username must contain only letters, numbers, dots, hyphens, and underscores",
  minPasswordLength: 8,
  maxPasswordLength: 64,
  enforcePasswordStrength: true,
  minPasswordStrength: 2, // Medium strength or better
};

/**
 * Password strength levels
 */
export enum PasswordStrengthLevel {
  VERY_WEAK = 0,
  WEAK = 1,
  MEDIUM = 2,
  STRONG = 3,
}

/**
 * Password strength result
 */
export interface PasswordStrengthResult {
  id: PasswordStrengthLevel;
  value: "Very Weak" | "Weak" | "Medium" | "Strong";
  message: string;
  containsUppercase: boolean;
  containsLowercase: boolean;
  containsNumber: boolean;
  containsSpecialChar: boolean;
  length: number;
}

/**
 * Validation error result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validation schemas creator
 * Creates yup validation schemas using the configured rules
 */
export class ValidationSchemas {
  private rules: ValidationRules;

  /**
   * Create validation schemas with customized rules
   * @param customRules Custom validation rules
   */
  constructor(customRules: Partial<ValidationRules> = {}) {
    this.rules = {
      ...defaultValidationRules,
      ...customRules,
    };
  }

  /**
   * Username validation schema
   */
  get username() {
    return yup
      .string()
      .required("Username is required")
      .min(
        this.rules.minUsernameLength,
        `Username must be at least ${this.rules.minUsernameLength} characters`,
      )
      .max(
        this.rules.maxUsernameLength,
        `Username cannot exceed ${this.rules.maxUsernameLength} characters`,
      )
      .matches(this.rules.usernamePattern, this.rules.usernamePatternError);
  }

  /**
   * Password validation schema
   */
  get password() {
    let schema = yup
      .string()
      .required("Password is required")
      .min(
        this.rules.minPasswordLength,
        `Password must be at least ${this.rules.minPasswordLength} characters`,
      )
      .max(
        this.rules.maxPasswordLength,
        `Password cannot exceed ${this.rules.maxPasswordLength} characters`,
      );

    // Add password strength validation if enabled
    if (this.rules.enforcePasswordStrength) {
      schema = schema.test(
        "password-strength",
        `Password is not strong enough`,
        (value) =>
          this.checkPasswordStrength(value).id >=
          this.rules.minPasswordStrength,
      );
    }

    return schema;
  }

  /**
   * Email validation schema
   */
  get email() {
    let schema = yup
      .string()
      .required("Email is required")
      .email("Invalid email format");

    // Add custom email pattern if specified
    if (this.rules.emailPattern) {
      schema = schema.matches(
        this.rules.emailPattern,
        this.rules.emailPatternError || "Email format is invalid",
      );
    }

    return schema;
  }

  /**
   * Login schema (username/email and password)
   */
  get login() {
    return yup.object({
      username: this.username,
      password: this.password,
    });
  }

  /**
   * Registration schema
   */
  get registration() {
    return yup.object({
      username: this.username,
      password: this.password,
      email: this.email,
      firstName: yup.string().optional(),
      lastName: yup.string().optional(),
    });
  }

  /**
   * Password reset schema
   */
  get passwordReset() {
    return yup.object({
      currentPassword: this.password,
      newPassword: this.password,
      confirmPassword: yup
        .string()
        .required("Please confirm your password")
        .oneOf([yup.ref("newPassword")], "Passwords must match"),
    });
  }

  /**
   * Forgot password schema
   */
  get forgotPassword() {
    return yup.object({
      email: this.email,
    });
  }

  /**
   * Checks password strength
   * @param password Password to check
   * @returns Password strength result
   */
  checkPasswordStrength(password?: string): PasswordStrengthResult {
    if (!password) {
      return {
        id: PasswordStrengthLevel.VERY_WEAK,
        value: "Very Weak",
        message: "Password is empty",
        containsUppercase: false,
        containsLowercase: false,
        containsNumber: false,
        containsSpecialChar: false,
        length: 0,
      };
    }

    // Use password-strength library for calculation
    const result = passwordStrength(password);

    // Convert to our format
    return {
      id: result.id as PasswordStrengthLevel,
      value: result.value as "Very Weak" | "Weak" | "Medium" | "Strong",
      message: this.getPasswordStrengthMessage(result.id),
      containsUppercase: /[A-Z]/.test(password),
      containsLowercase: /[a-z]/.test(password),
      containsNumber: /[0-9]/.test(password),
      containsSpecialChar: /[^A-Za-z0-9]/.test(password),
      length: password.length,
    };
  }

  /**
   * Gets a user-friendly message for password strength
   * @param strengthLevel Password strength level
   * @returns User-friendly message
   */
  private getPasswordStrengthMessage(strengthLevel: number): string {
    switch (strengthLevel) {
      case PasswordStrengthLevel.VERY_WEAK:
        return "Password is very weak. Consider using a longer password with a mix of characters.";
      case PasswordStrengthLevel.WEAK:
        return "Password is weak. Try adding uppercase letters, numbers, or special characters.";
      case PasswordStrengthLevel.MEDIUM:
        return "Password strength is medium. For better security, make it longer or more complex.";
      case PasswordStrengthLevel.STRONG:
        return "Password is strong.";
      default:
        return "Password strength is unknown.";
    }
  }
}

/**
 * Authentication validator class
 * Provides methods to validate authentication data
 */
export class AuthValidator {
  private schemas: ValidationSchemas;

  /**
   * Creates an authentication validator
   * @param customRules Custom validation rules
   */
  constructor(customRules: Partial<ValidationRules> = {}) {
    this.schemas = new ValidationSchemas(customRules);
  }

  /**
   * Validates login credentials
   * @param username Username or email
   * @param password Password
   * @returns Validation result
   */
  validateLogin(username: string, password: string): ValidationResult {
    try {
      this.schemas.login.validateSync(
        { username, password },
        { abortEarly: false },
      );
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Validates registration data
   * @param data Registration data
   * @returns Validation result
   */
  validateRegistration(data: any): ValidationResult {
    try {
      this.schemas.registration.validateSync(data, { abortEarly: false });
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Validates password reset data
   * @param currentPassword Current password
   * @param newPassword New password
   * @param confirmPassword Confirmation of new password
   * @returns Validation result
   */
  validatePasswordReset(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): ValidationResult {
    try {
      this.schemas.passwordReset.validateSync(
        { currentPassword, newPassword, confirmPassword },
        { abortEarly: false },
      );
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Validates forgot password request
   * @param email Email address
   * @returns Validation result
   */
  validateForgotPassword(email: string): ValidationResult {
    try {
      this.schemas.forgotPassword.validateSync(
        { email },
        { abortEarly: false },
      );
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Validates username format
   * @param username Username to validate
   * @returns Validation result
   */
  validateUsername(username: string): ValidationResult {
    try {
      this.schemas.username.validateSync(username);
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Validates email format
   * @param email Email to validate
   * @returns Validation result
   */
  validateEmail(email: string): ValidationResult {
    try {
      this.schemas.email.validateSync(email);
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Validates password format and strength
   * @param password Password to validate
   * @returns Validation result
   */
  validatePassword(password: string): ValidationResult {
    try {
      this.schemas.password.validateSync(password);
      return { isValid: true, errors: {} };
    } catch (error) {
      return this.formatYupError(error);
    }
  }

  /**
   * Gets password strength
   * @param password Password to check
   * @returns Password strength result
   */
  getPasswordStrength(password: string): PasswordStrengthResult {
    return this.schemas.checkPasswordStrength(password);
  }

  /**
   * Converts Yup validation error to standardized format
   * @param error Yup validation error
   * @returns Standardized validation result
   */
  private formatYupError(error: any): ValidationResult {
    if (error.inner) {
      const formattedErrors: Record<string, string> = {};

      error.inner.forEach((err: any) => {
        formattedErrors[err.path || "_error"] = err.message;
      });

      return {
        isValid: false,
        errors: formattedErrors,
      };
    }

    return {
      isValid: false,
      errors: {
        _error: error.message || "Validation error occurred",
      },
    };
  }
}

// Create default validator instance for direct imports
export const authValidator = new AuthValidator();

// Helper functions for direct use
/**
 * Validates login credentials
 * @param username Username or email
 * @param password Password
 * @returns Validation result
 */
export function validateLogin(
  username: string,
  password: string,
): ValidationResult {
  return authValidator.validateLogin(username, password);
}

/**
 * Validates registration data
 * @param data Registration data
 * @returns Validation result
 */
export function validateRegistration(data: any): ValidationResult {
  return authValidator.validateRegistration(data);
}

/**
 * Validates password format and strength
 * @param password Password to validate
 * @returns Validation result
 */
export function validatePassword(password: string): ValidationResult {
  return authValidator.validatePassword(password);
}

/**
 * Gets password strength
 * @param password Password to check
 * @returns Password strength result
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  return authValidator.getPasswordStrength(password);
}

/**
 * Validates username format
 * @param username Username to validate
 * @returns Validation result
 */
export function validateUsername(username: string): ValidationResult {
  return authValidator.validateUsername(username);
}

/**
 * Validates email format
 * @param email Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  return authValidator.validateEmail(email);
}

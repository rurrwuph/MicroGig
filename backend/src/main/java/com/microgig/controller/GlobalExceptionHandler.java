package com.microgig.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private Map<String, Object> createErrorBody(String error, String message, int status) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", error != null ? error : "Error");
        body.put("message", message != null ? message : "An error occurred");
        body.put("status", status);
        return body;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid value");
        }

        Map<String, Object> body = createErrorBody("Validation Failed",
                errors.values().stream().findFirst().orElse("Validation failed"),
                HttpStatus.BAD_REQUEST.value());
        body.put("errors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "Invalid username or password";
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(createErrorBody("Unauthorized", msg, HttpStatus.UNAUTHORIZED.value()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(createErrorBody("Forbidden", "You do not have permission to access this resource", HttpStatus.FORBIDDEN.value()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "Bad Request";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(createErrorBody("Bad Request", msg, HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        String msg = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "Forbidden operation";
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(createErrorBody("Forbidden", msg, HttpStatus.FORBIDDEN.value()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(Exception ex) {
        String message = (ex.getMessage() != null && !ex.getMessage().isBlank()) ? ex.getMessage() : "An unexpected server error occurred.";
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(createErrorBody("Internal Server Error", message, HttpStatus.INTERNAL_SERVER_ERROR.value()));
    }
}

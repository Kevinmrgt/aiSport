// Classe d'erreur typée pour le middleware centralisé (architecture.md)
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    // Maintenir la stack trace correcte en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Non autorisé'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Accès refusé'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource: string): AppError {
    return new AppError(404, 'NOT_FOUND', `${resource} introuvable`);
  }

  static internal(message = 'Erreur interne du serveur'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }

  static serviceUnavailable(message: string): AppError {
    return new AppError(503, 'SERVICE_UNAVAILABLE', message);
  }
}

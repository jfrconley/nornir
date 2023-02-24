export namespace Errors {
  export abstract class NornirBaseError extends Error implements NodeJS.ErrnoException {
    abstract name: string;
    message: string;
    constructor(message: string, public readonly code?: string) {
      super(message);
      this.message = message;
    }
  }

  export class NornirBuildError extends NornirBaseError {
    name = "NornirBuildError"
    constructor(message: string) {
      super(message);
    }
  }

  export class NornirValidationError extends NornirBaseError {
    name = "NornirValidationError"
    constructor(message: string) {
      super(message);
    }
  }

  export class NornirMissingAttachmentException extends NornirBaseError {
    public name = 'NornirMissingAttachmentException';
    constructor() {
      super("Required attachment was missing from registry");
    }
  }
}

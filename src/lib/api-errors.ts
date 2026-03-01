export function handleApiError(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    // If it's a standard Error object, we can check if it's a Supabase error
    // Supabase errors often have a 'code' or 'details' property, but we'll keep it simple
    // and avoid leaking raw database details like "relation 'users' does not exist"
    const message = error.message.toLowerCase();
    if (
      message.includes('relation') ||
      message.includes('syntax error') ||
      message.includes('violates') ||
      message.includes('database')
    ) {
      return fallbackMessage;
    }
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Handle Supabase PostgrestError shape roughly
    const err = error as Record<string, unknown>;
    if (err.code || err.details || err.hint) {
      return fallbackMessage;
    }
    if (typeof err.message === 'string') {
      return err.message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return fallbackMessage;
}

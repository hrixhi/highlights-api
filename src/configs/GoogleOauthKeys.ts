let isDevelopment = false;

export const GOOGLE_CLIENT_ID = '944571029689-uomcavnjljb3hvnhitjeooe3uc52bsgi.apps.googleusercontent.com';
export const GOOGLE_CLIENT_SECRET = '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';
export const GOOGLE_REDIRECT_URI = isDevelopment
    ? 'http://localhost:19006/google_auth'
    : 'https://app.learnwithcues.com/google_auth';

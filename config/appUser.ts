export const APP_USER_ID = import.meta.env.VITE_APP_USER_ID as string;

if (!APP_USER_ID) {
  throw new Error('VITE_APP_USER_ID is not set in .env');
}

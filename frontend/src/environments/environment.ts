// Development environment configuration.
// This file is used when running: npm start / ng serve
// For production builds, see: environment.prod.ts

export const environment = {
  production: false,

  // The base URL of the NestJS backend API.
  // Change to your ngrok URL when testing Google OAuth (which requires HTTPS):
  //   apiUrl: 'https://unduly-enjoyed-parrot.ngrok-free.app/api/v1',
  apiUrl: 'http://localhost:3000/api/v1',
};

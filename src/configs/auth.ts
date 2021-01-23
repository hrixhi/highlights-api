import { facebookProvider } from './auth/facebook';
import { googleProvider } from './auth/google';
import { passwordProvider } from './auth/password';

export interface IAuthConfigProvider {
  appId: string;
  appSecret: string;
  redirectUri?: string;
}

export enum providersList {
  FACEBOOK = "facebook",
  GOOGLE = "google",
  PASSWORD = "password"
}

const configuration = {
  password: passwordProvider,
  google: googleProvider,
  facebook: facebookProvider
};

export const AuthConfig: any = {
  providers: providersList,
  configuration
};

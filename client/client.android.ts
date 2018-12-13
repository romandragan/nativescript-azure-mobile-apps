/*! *****************************************************************************
Copyright (c) 2016 Tangra Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
***************************************************************************** */
import * as common from "./client-common";
import * as application from "application";
import { MobileServiceTable } from "../table";
import { MobileServiceUser, AuthenticationProvider } from "../user";
import { MobileServicePush } from "../push";

export * from "./client-common";

const nativeAuthenticationProviders = [];
nativeAuthenticationProviders[AuthenticationProvider.AzureActiveDirectory] = com.microsoft.windowsazure.mobileservices.authentication.MobileServiceAuthenticationProvider.WindowsAzureActiveDirectory;
nativeAuthenticationProviders[AuthenticationProvider.Google] = com.microsoft.windowsazure.mobileservices.authentication.MobileServiceAuthenticationProvider.Google;
nativeAuthenticationProviders[AuthenticationProvider.Facebook] = com.microsoft.windowsazure.mobileservices.authentication.MobileServiceAuthenticationProvider.Facebook;
nativeAuthenticationProviders[AuthenticationProvider.Twitter] = com.microsoft.windowsazure.mobileservices.authentication.MobileServiceAuthenticationProvider.Twitter;
nativeAuthenticationProviders[AuthenticationProvider.MicrosoftAccount] = com.microsoft.windowsazure.mobileservices.authentication.MobileServiceAuthenticationProvider.MicrosoftAccount;

export class MobileServiceClient extends common.MobileServiceClient {
    protected _msClient: com.microsoft.windowsazure.mobileservices.MobileServiceClient; // Redeclaration for typing info
    
    constructor(url: string) {
        super(url);
        
        const androidApp = application.android;
        const context = androidApp.currentContext
            || androidApp.foregroundActivity
            || androidApp.startActivity; // Paranoia checks as we do not what will be initialized in {N} 3.4+
        
        this._msClient = new com.microsoft.windowsazure.mobileservices.MobileServiceClient(url, context);
        this._msClient.setAndroidHttpClientFactory(new com.microsoft.windowsazure.mobileservices.http.OkHttpClientFactory({
            createOkHttpClient: () => {
                let client = new com.squareup.okhttp.OkHttpClient();
                client.setReadTimeout(20, java.util.concurrent.TimeUnit.SECONDS);
                client.setWriteTimeout(20, java.util.concurrent.TimeUnit.SECONDS);
                return client;
            }
        }));

        this.push = new MobileServicePush(this._msClient.getPush());
    }

    public getTable(tableName: string): MobileServiceTable {
        return new MobileServiceTable(this._msClient.getTable(tableName));
    }

    public handleActivityResult(intent: any): Promise<MobileServiceUser> {
        const result = this._msClient.onActivityResult(intent);

        if (result.isLoggedIn()) {
          return Promise.resolve(new MobileServiceUser(this._msClient.getCurrentUser(), this._url));
        }

        return Promise.reject(result.getErrorMessage());
    };

    public login(provider: AuthenticationProvider, urlScheme?: string): Promise<MobileServiceUser> {
        return new Promise((resolve, reject) => {
            try {
                this._msClient.login(nativeAuthenticationProviders[provider], urlScheme, provider);
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    }
    
    public loginFromCache(): boolean {
        let user = MobileServiceUser.getFromCache();
        
        if (!user) {
            return false;
        }
        
        this.user = user;
        this._msClient.setCurrentUser(this.user.nativeValue);
        
        return true;
    }
}
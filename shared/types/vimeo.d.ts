declare module '@vimeo/vimeo' {
  export class Vimeo {
    constructor(clientId: string, clientSecret: string, accessToken: string);
    
    request(options: {
      method: string;
      path: string;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      body?: any;
    }, callback: (error: any, body: any, statusCode: number, headers: any) => void): void;
    
    upload(
      filePath: string,
      options: {
        name: string;
        description?: string;
        privacy?: {
          view: 'anybody' | 'password' | 'disable' | 'nobody' | 'unlisted';
        };
        embed?: {
          buttons?: {
            like?: boolean;
            watchlater?: boolean;
            share?: boolean;
          };
          logos?: {
            vimeo?: boolean;
          };
          title?: {
            name?: string;
            owner?: string;
            portrait?: string;
          };
        };
      },
      completeCallback: (uri: string) => void,
      errorCallback: (error: any) => void,
      progressCallback?: (bytesUploaded: number, bytesTotal: number) => void
    ): void;
  }
}
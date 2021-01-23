declare module "fbgraph" {
  import "fbgraph";
  namespace fbgraph {
    function setAccessToken(accessToken: string): Promise<any>;
    function get(url: string, cb: (err: any, res: any) => void): Promise<any>;
    function post(url: string, cb: (err: any, res: any) => void): Promise<any>;
  }
  export = fbgraph;
}

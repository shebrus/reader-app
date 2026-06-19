declare module "pako" {
  export class Inflate {
    err: number;
    msg: string;
    onData: (chunk: Uint8Array | number[] | string) => void;

    constructor(options?: {
      chunkSize?: number;
      raw?: boolean;
      to?: string;
      windowBits?: number;
    });

    push(data: Uint8Array, mode?: boolean | number): boolean;
  }
}

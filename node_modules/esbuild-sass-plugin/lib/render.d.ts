import { SassPluginOptions } from './index';
export type RenderSync = (path: string) => RenderResult;
export type RenderResult = {
    cssText: string;
    watchFiles: string[];
};
export declare function createRenderer(options: SassPluginOptions | undefined, sourcemap: boolean): RenderSync;

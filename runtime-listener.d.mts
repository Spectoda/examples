export interface ModuleListener {
  readonly host: string;
  readonly port: number;
}

export interface ListenerConfig {
  server?: Record<string, unknown>;
  preview?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare const moduleListener: ModuleListener;

export declare function resolveModuleListener(
  env?: Record<string, string | undefined>,
): ModuleListener;

export declare function withModuleListener<T extends ListenerConfig>(
  config?: T,
  env?: Record<string, string | undefined>,
): T & {
  server: Record<string, unknown> & ModuleListener & { strictPort: true };
  preview: Record<string, unknown> & ModuleListener & { strictPort: true };
};

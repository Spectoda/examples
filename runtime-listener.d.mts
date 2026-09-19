export interface ModuleListener {
  readonly host: string;
  readonly port: number;
}

export interface ResolvedModuleListener extends ModuleListener {
  /** Validated public https origin; present only on hosted runs. */
  readonly externalOrigin?: string;
}

export interface ListenerConfig {
  server?: Record<string, unknown>;
  preview?: Record<string, unknown>;
  [key: string]: unknown;
}

export declare const moduleListener: ModuleListener;

export declare const EXTERNAL_ORIGIN_VARIABLE: "LAZURIO_RUNTIME_LISTENER_APP_EXTERNAL_ORIGIN";

export declare const ENTRYPOINT_EXTERNAL_ORIGIN_VARIABLE: "LAZURIO_RUNTIME_EXTERNAL_ORIGIN";

export declare function resolveExternalOrigin(
  env?: Record<string, string | undefined>,
): string | null;

export declare function resolveModuleListener(
  env?: Record<string, string | undefined>,
): ResolvedModuleListener;

export declare function withExternalOrigin<T extends ListenerConfig>(
  config?: T,
  listener?: ResolvedModuleListener | null,
): T;

export declare function withModuleListener<T extends ListenerConfig>(
  config?: T,
  env?: Record<string, string | undefined>,
): T & {
  server: Record<string, unknown> & ModuleListener & { strictPort: true };
  preview: Record<string, unknown> & ModuleListener & { strictPort: true };
};

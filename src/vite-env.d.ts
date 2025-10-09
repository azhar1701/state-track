/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/pwa" />

declare module 'virtual:pwa-register/react' {
	export interface RegisterSWOptions {
		immediate?: boolean;
		onNeedRefresh?: () => void;
		onOfflineReady?: () => void;
		onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
		onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
		onRegisterError?: (error: unknown) => void;
	}
	export function useRegisterSW(options?: RegisterSWOptions): {
		offlineReady: [boolean, (v: boolean) => void];
		needRefresh: [boolean, (v: boolean) => void];
		updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
	};
}

export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.BHUAH8HF.js",app:"_app/immutable/entry/app.PI1dNWTZ.js",imports:["_app/immutable/entry/start.BHUAH8HF.js","_app/immutable/chunks/CAnNJyC3.js","_app/immutable/chunks/CKeiiy6W.js","_app/immutable/chunks/z6JSUJ7G.js","_app/immutable/entry/app.PI1dNWTZ.js","_app/immutable/chunks/CKeiiy6W.js","_app/immutable/chunks/BJ9-1o-c.js","_app/immutable/chunks/CHVxyK4u.js","_app/immutable/chunks/z6JSUJ7G.js","_app/immutable/chunks/B8HUVbm9.js","_app/immutable/chunks/e6-oAkPb.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/compress",
				pattern: /^\/api\/compress\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/compress/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

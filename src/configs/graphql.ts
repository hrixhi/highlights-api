export default {
    debug: true,
    endpoint: '/',
    playground: '/playground',
    subscriptions: {
        port: 4100,
    },
    port: 8000,
    bodyParserOptions: { limit: '50mb', type: 'application/json' },
    uploads: {
        maxFieldSize: 1000000000,
        maxFileSize: 1000000000,
    },
};

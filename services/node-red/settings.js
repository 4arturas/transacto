module.exports = {

    flowFile: 'flows.json',
    flowFilePretty: true,

    uiPort: process.env.PORT || 1880,

    diagnostics: {
        enabled: true,
        ui: true,
    },
    runtimeState: {
        enabled: false,
        ui: false,
    },

    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },

    exportGlobalContextKeys: false,

    functionExternalModules: true,

    editorTheme: {
        palette: {},
        projects: {
            enabled: false,
            workflow: {
                mode: "manual"
            }
        },
        codeEditor: {
            lib: "monaco",
            options: {}
        },
        markdownEditor: {
            mermaid: {
                enabled: true
            }
        },
        multiplayer: {
            enabled: false
        },
    },

    functionGlobalContext: {},

    debugMaxLength: 1000,
    mqttReconnectTime: 15000,
    serialReconnectTime: 15000,

    openapi: {
        template: {
            info: {
                title: 'Transacto Transaction API Prototype',
                version: '1.0.0',
                description: 'REST API for transactions and accounts. Prototyped in Node-RED, implemented in Java/Spring Boot and TypeScript/Express.'
            },
            servers: [
                {
                    url: 'http://localhost:1880/',
                    description: 'Node-RED prototype server'
                },
                {
                    url: 'http://localhost:4000',
                    description: 'Transaction API (Java/Spring Boot)'
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        },
        parameters: [
            {
                name: 'Authorization',
                in: 'header',
                description: 'Bearer token for authentication',
                required: true,
                schema: {
                    type: 'string',
                    pattern: '^Bearer .+$'
                }
            }
        ]
    }
};

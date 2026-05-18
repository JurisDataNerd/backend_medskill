import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Medskill LMS API",
      version: "1.0.0",
      description: "API Documentation Medskill Backend"
    },
    servers: [
      {
        url: "http://localhost:5000",
      }
    ]
  },
  apis: ["./routes/*.js", "./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const serverless = require("serverless-http");
const bodyParser = require("body-parser");

const app = express();
const client = new DynamoDBClient({
  region: process.env.REGION || "us-east-1"
});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.STORAGE_TODOTABLE_NAME || "todos-dev";

const typeDefs = `#graphql
  type Todo { id: ID! name: String! description: String completed: Boolean! }
  type Query { getTodos: [Todo] }
  type Mutation {
    addTodo(name: String!, description: String): Todo
    toggleTodo(id: ID!): Todo
  }
`;

const resolvers = {
  Query: {
    getTodos: async () => {
      console.log("getTodos called, TABLE_NAME:", TABLE_NAME);
      console.log("Region:", process.env.REGION);
      try {
        const result = await docClient.send(
          new ScanCommand({ TableName: TABLE_NAME })
        );
        console.log("DynamoDB result:", result);
        return result.Items || [];
      } catch (err) {
        console.log("DynamoDB error:", err);
        return [];
      }
    }
  },
  Mutation: {
    addTodo: async (_, { name, description }) => {
      const newTodo = { id: uuidv4(), name, description, completed: false };
      await docClient.send(
        new PutCommand({ TableName: TABLE_NAME, Item: newTodo })
      );
      return newTodo;
    },
    toggleTodo: async (_, { id }) => {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression: "SET completed = :c",
          ExpressionAttributeValues: { ":c": true },
          ReturnValues: "ALL_NEW"
        })
      );
      return result.Attributes;
    }
  }
};

let serverStarted = false;
const server = new ApolloServer({ typeDefs, resolvers });

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  console.log("Handler called, serverStarted:", serverStarted);
  context.callbackWaitsForEmptyEventLoop = false;
  if (!serverStarted) {
    console.log("Starting Apollo server...");
    await server.start();
    console.log("Apollo server started!");
    app.use("/graphql", expressMiddleware(server));
    serverStarted = true;
  }
  return handler(event, context);
};

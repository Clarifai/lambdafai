# lambdafai  [![Build Status](https://travis-ci.com/Clarifai/lambdafai.svg?token=hV4tTqzcLZhd9QUcMUt9&branch=master)](https://travis-ci.com/Clarifai/lambdafai)
*Taking the “Lame” out of Lambda, since 2016*

```js
var lambdafai = require('lambdafai');

lambdafai('hello-world', function(app) {
  var hello = app.lambda({ name: 'hello' });

  hello.get('/hello', function(req, res) {
    res.send('Hello, world!');
  });
});
```

Lambdafai is a simple framework for building and deploying REST APIs using AWS Lambda, API Gateway,
DynamoDB, and S3. It consists of:
  * A library for routing and handling requests with [Express](http://expressjs.com/)-like syntax.
  * A command-line tool for creating, testing, and deploying your API.
  * A standard library to simplify interacting with AWS services like DynamoDB.
    * Using this library is optional - you can interact directly with the AWS APIs if you want


## Getting Started

The easiest way to get started is to jump into the [Hello World example](examples/hello-world).
This demonstrates how to use Lambdafai in a development workflow using the command-line tool.

The [To-do example](examples/todo) is a more complete example that demonstrates how to use
DynamoDB and S3 support.

You can view the full API Reference by running:
```
npm run jsdoc
```

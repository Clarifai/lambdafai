var Application = require('../../lib/api/application');
var events = require('../../lib/internal/lambda-events');

// Events: these are taken from the Lambda test event generator:

var S3_PUT = {
  "Records": [
    {
      "eventVersion": "2.0",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "s3": {
        "configurationId": "testConfigRule",
        "object": {
          "eTag": "0123456789abcdef0123456789abcdef",
          "sequencer": "0A1B2C3D4E5F678901",
          "key": "uploads/HappyFace.jpg",
          "size": 1024
        },
        "bucket": {
          "arn": "arn:aws:s3:::sourcebucket",
          "name": "sourcebucket",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          }
        },
        "s3SchemaVersion": "1.0"
      },
      "responseElements": {
        "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH",
        "x-amz-request-id": "EXAMPLE123456789"
      },
      "awsRegion": "us-east-1",
      "eventName": "ObjectCreated:Put",
      "userIdentity": {
        "principalId": "EXAMPLE"
      },
      "eventSource": "aws:s3"
    }
  ]
};

var S3_DELETE = {
  "Records": [
    {
      "eventVersion": "2.0",
      "eventTime": "1970-01-01T00:00:00.000Z",
      "requestParameters": {
        "sourceIPAddress": "127.0.0.1"
      },
      "s3": {
        "configurationId": "testConfigRule",
        "object": {
          "sequencer": "0A1B2C3D4E5F678901",
          "key": "uploads/HappyFace.jpg"
        },
        "bucket": {
          "arn": "arn:aws:s3:::sourcebucket",
          "name": "sourcebucket",
          "ownerIdentity": {
            "principalId": "EXAMPLE"
          }
        },
        "s3SchemaVersion": "1.0"
      },
      "responseElements": {
        "x-amz-id-2": "EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH",
        "x-amz-request-id": "EXAMPLE123456789"
      },
      "awsRegion": "us-east-1",
      "eventName": "ObjectRemoved:Delete",
      "userIdentity": {
        "principalId": "EXAMPLE"
      },
      "eventSource": "aws:s3"
    }
  ]
};

var DYNAMODB_INSERT = {
  "Records": [
    {
      "eventID": "1",
      "eventVersion": "1.0",
      "dynamodb": {
        "Keys": {
          "Id": {
            "N": "101"
          }
        },
        "NewImage": {
          "Message": {
            "S": "New item!"
          },
          "Id": {
            "N": "101"
          }
        },
        "StreamViewType": "NEW_AND_OLD_IMAGES",
        "SequenceNumber": "111",
        "SizeBytes": 26
      },
      "awsRegion": "us-west-2",
      "eventName": "INSERT",
      "eventSourceARN": "arn:aws:dynamodb:us-west-2:account-id:table/T/stream/2015-06-27T00:48:05",
      "eventSource": "aws:dynamodb"
    },
  ]
};

var API_GATEWAY_EVENT = {
  "body": "{\"test\":\"body\"}",
  "resource": "/{proxy+}",
  "requestContext": {
    "resourceId": "123456",
    "apiId": "1234567890",
    "resourcePath": "/{proxy+}",
    "httpMethod": "POST",
    "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
    "accountId": "123456789012",
    "identity": {
      "apiKey": null,
      "userArn": null,
      "cognitoAuthenticationType": null,
      "caller": null,
      "userAgent": "Custom User Agent String",
      "user": null,
      "cognitoIdentityPoolId": null,
      "cognitoIdentityId": null,
      "cognitoAuthenticationProvider": null,
      "sourceIp": "127.0.0.1",
      "accountId": null
    },
    "stage": "prod"
  },
  "queryStringParameters": {
    "foo": "bar"
  },
  "headers": {
    "Via": "1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)",
    "Accept-Language": "en-US,en;q=0.8",
    "CloudFront-Is-Desktop-Viewer": "true",
    "CloudFront-Is-SmartTV-Viewer": "false",
    "CloudFront-Is-Mobile-Viewer": "false",
    "X-Forwarded-For": "127.0.0.1, 127.0.0.2",
    "CloudFront-Viewer-Country": "US",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Upgrade-Insecure-Requests": "1",
    "X-Forwarded-Port": "443",
    "Host": "1234567890.execute-api.us-east-1.amazonaws.com",
    "X-Forwarded-Proto": "https",
    "X-Amz-Cf-Id": "cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==",
    "CloudFront-Is-Tablet-Viewer": "false",
    "Cache-Control": "max-age=0",
    "User-Agent": "Custom User Agent String",
    "CloudFront-Forwarded-Proto": "https",
    "Accept-Encoding": "gzip, deflate, sdch"
  },
  "pathParameters": {
    "proxy": "path/to/resource"
  },
  "httpMethod": "POST",
  "stageVariables": {
    "baz": "qux"
  },
  "path": "/path/to/resource"
};

var SCHEDULED_EVENT = {
  "account": "123456789012",
  "region": "us-east-1",
  "detail": {},
  "detail-type": "Scheduled Event",
  "source": "aws.events",
  "time": "1970-01-01T00:00:00Z",
  "id": "cdc73f9d-aea9-11e3-9d5a-835b769c0d9c",
  "resources": [
    "arn:aws:events:us-east-1:123456789012:rule/my-schedule"
  ]
};

var API_GATEWAY_AUTHORIZER_EVENT = {
  "authorizationToken": "Bearer foo",
  "methodArn": "arn:aws:execute-api:us-east-1:123456789012/dev/GET/auth",
  "type": "TOKEN"
};

var COGNITO_EVENT = {
  "version": 1,
  "triggerSource": "PreSignUp_SignUp",
  "region": "us-east-1",
  "userPoolId": "abc",
  "callerContext": {
    "awsSdkVersion": "version",
    "clientId": "client"
  },
  "request": {
    "userAttributes": {
      "name": "bob",
    }
  },
  "response": {}
};

var CONTEXT = {
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:12345678:function:hello-world-hello:dev'
}

describe('LambdaEvents#standardizeEvent', function() {
  var app;

  beforeEach(function() {
    app = new Application('test');
    app.lambda({ name: 'foo' })
       .s3put('/uploads/:name', null)
       .scheduledEvent('/my-schedule', null)
       .apiGatewayAuthorizerEvent('/auth', null)
  });

  it('converts API gateway event', function() {
    expect(events.standardizeEvent(app, API_GATEWAY_EVENT, CONTEXT)).toEqual({
      method: 'POST',
      stage: 'prod',
      path: '/{proxy+}',
      headers: { 
        'Via': '1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)',
        'Accept-Language': 'en-US,en;q=0.8',
        'CloudFront-Is-Desktop-Viewer': 'true',
        'CloudFront-Is-SmartTV-Viewer': 'false',
        'CloudFront-Is-Mobile-Viewer': 'false',
        'X-Forwarded-For': '127.0.0.1, 127.0.0.2',
        'CloudFront-Viewer-Country': 'US',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'X-Forwarded-Port': '443',
        'Host': '1234567890.execute-api.us-east-1.amazonaws.com',
        'X-Forwarded-Proto': 'https',
        'X-Amz-Cf-Id': 'cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==',
        'CloudFront-Is-Tablet-Viewer': 'false',
        'Cache-Control': 'max-age=0',
        'User-Agent': 'Custom User Agent String',
        'CloudFront-Forwarded-Proto': 'https',
        'Accept-Encoding': 'gzip, deflate, sdch' 
      },
      params: { 
        proxy: 'path/to/resource' 
      },
      query: { 
        foo: 'bar' 
      },
      body: '{"test":"body"}',
      stageVariables: { 
        baz: 'qux' 
      },
      requestContext: { 
        resourceId: '123456',
        apiId: '1234567890',
        resourcePath: '/{proxy+}',
        httpMethod: 'POST',
        requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
        accountId: '123456789012',
        identity: { 
          apiKey: null,
          userArn: null,
          cognitoAuthenticationType: null,
          caller: null,
          userAgent: 'Custom User Agent String',
          user: null,
          cognitoIdentityPoolId: null,
          cognitoIdentityId: null,
          cognitoAuthenticationProvider: null,
          sourceIp: '127.0.0.1',
          accountId: null 
        },
        stage: 'prod' 
      },
      claims: null,
      apiGateway: true 
    });
  });

  it('converts S3 put event', function() {
    expect(events.standardizeEvent(app, S3_PUT, CONTEXT)).toEqual({
      method: 'S3PUT',
      stage: 'dev',
      path: '/uploads/HappyFace.jpg',
      params: '{name=HappyFace.jpg}',
      paramNames: '[name]',
      body: {
        Size: 1024,
        Bucket: 'sourcebucket'
      }
    });
  });

  it('rejects s3 delete event', function() {
    expect(events.standardizeEvent(app, S3_DELETE, CONTEXT)).toBeUndefined();
  });
  
  it('converts scheduled event', function() {
    expect(events.standardizeEvent(app, SCHEDULED_EVENT, CONTEXT)).toEqual({
      method: 'SCHEDULEDEVENT',
      stage: 'dev',
      path: '/my-schedule'
    });
  });
  
  it('converts api gateway authorizer event', function() {
    expect(events.standardizeEvent(app, API_GATEWAY_AUTHORIZER_EVENT, CONTEXT)).toEqual({
      method: 'APIGATEWAYAUTHORIZEREVENT',
      stage: 'dev',
      path: '/GET/auth',
      headers: {
        Authorization: 'Bearer foo'
      },
      body: {
        authorizationToken: 'Bearer foo',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789012/dev/GET/auth',
        type: 'TOKEN' 
      }
    });
  });
  
  it('converts cognito event', function() {
    expect(events.standardizeEvent(app, COGNITO_EVENT, CONTEXT)).toEqual({
      method: 'COGNITOEVENT',
      stage: 'dev',
      path: '/PreSignUp_SignUp',
      body: { 
        'version': 1,
        'triggerSource': 'PreSignUp_SignUp',
        'region': 'us-east-1', 
        'userPoolId': 'abc',
        'callerContext': { 
          'awsSdkVersion': 'version', 
          'clientId': 'client' 
        },
        request: { 
          'userAttributes': {
            'name': 'bob' 
          } 
        }, 
        response: {}
      }
    });
  });
  
  it('converts DynamoDB Insert event', function() {
    expect(events.standardizeEvent(app, DYNAMODB_INSERT, CONTEXT)).toEqual({
      "method": "DYNAMODBINSERT",
      "stage": "dev",
      "path": "/T",
      "body": {
        "Keys": {
          "Id": {
          "N": "101"
        }
      },
      "NewImage": {
        "Message": {
          "S": "New item!"
        },
        "Id": {
          "N": "101"
        }
      },
      "StreamViewType": "NEW_AND_OLD_IMAGES",
      "SequenceNumber": "111",
      "SizeBytes": 26
    } 
    });
  });
});

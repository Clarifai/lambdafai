var _ = require('lodash');
var aws = require('aws-sdk');
var db = require('../../lib/api/database');

describe('Database', function() {
  var client;
  var err;
  var result;

  function capture(_err, _result) {
    err = _err;
    result = _result;
  }

  // Verifies that the spy has been called once, and then invokes the last argument of that call.
  function invokeCallback(spy, err, data) {
    expect(spy.calls.count()).toEqual(1);
    var args = spy.calls.argsFor(0);
    var callback = args[args.length - 1];
    callback(err, data);
  }

  beforeEach(function() {
    err = undefined;
    result = undefined;
    client = jasmine.createSpyObj('client',
        ['get', 'batchGet', 'batchWrite', 'query', 'put', 'update', 'delete']);
    spyOn(aws.DynamoDB, 'DocumentClient').and.returnValue(client);
  });

  describe('#list', function() {
    it('lists items', function() {
      db.table('T').list({Key: {h: 'hash'}}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'T',
        KeyConditionExpression: '#hashKey=:hashKey',
        ExpressionAttributeNames: { '#hashKey': 'h' },
        ExpressionAttributeValues: { ':hashKey': 'hash' },
        ConsistentRead: true,
        ScanIndexForward: true,
        Limit: 100
      }, jasmine.any(Function));

      var items = [{ h: 'hash', r: 234, createdAt: 123, modifiedAt: 123, title: 'Hi' },
                   { h: 'hash', r: 345, createdAt: 123, modifiedAt: 123, title: 'Bye' }];
      invokeCallback(client.query, null, { Items: items });
      expect(err).toBeNull();
      expect(result).toEqual(items);
    });

    it('lists items with range key limits', function() {
      db.table('T').list({Key: {h: 'hash'}, MinRangeKey: {r: 123}, MaxRangeKey: {r: 987}},
        capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'T',
        KeyConditionExpression:
            '#hashKey=:hashKey AND #rangeKey BETWEEN :minRangeKey AND :maxRangeKey',
        ExpressionAttributeNames: { '#hashKey': 'h', '#rangeKey': 'r' },
        ExpressionAttributeValues: { ':hashKey': 'hash', ':minRangeKey': 123, ':maxRangeKey': 987 },
        ConsistentRead: true,
        ScanIndexForward: true,
        Limit: 100
      }, jasmine.any(Function));
    });

    it('empty result', function() {
      db.table('T').list({Key: {h: 'hash'}}, capture);
      invokeCallback(client.query, null, { Items: [] });
      expect(err).toBeNull();
      expect(result).toEqual([]);
    });

    it('error from dynamodb', function() {
      db.table('T').list({Key: {h: 'hash'}}, capture);
      client.query.calls.argsFor(0)[1](new Error('Fail'));
      expect(err.message).toBe('Fail');
    });
  });
  
  describe('#listByIndex', function() {
    it('lists items', function() {
      db.table('T').listByIndex({Key: {id: 'someId'}, IndexName: 'SomeIndex'}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'T',
        IndexName: 'SomeIndex',
        KeyConditionExpression: 'id=:key',
        ExpressionAttributeValues: { ':key': 'someId' },
        ScanIndexForward: true,
        Limit: 100
      }, jasmine.any(Function));

      var items = [{ h: 'hash', r: 234, createdAt: 123, modifiedAt: 123, title: 'Hi', id: 'someId' }];
      invokeCallback(client.query, null, { Items: items });
      expect(err).toBeNull();
      expect(result).toEqual(items);
    });
    
    it('empty result', function() {
      db.table('T').listByIndex({Key: {id: 'someId'}, IndexName: 'SomeIndex'}, capture);
      invokeCallback(client.query, null, { Items: [] });
      expect(err).toBeNull();
      expect(result).toEqual([]);
    });
    
    it('error from dynamodb', function() {
      db.table('T').listByIndex({Key: {id: 'someId'}, IndexName: 'SomeIndex'}, capture);
      client.query.calls.argsFor(0)[1](new Error('Fail'));
      expect(err.message).toBe('Fail');
    });
  });

  describe('#get', function() {
    it('existing item', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}}, capture);
      expect(client.get).toHaveBeenCalledWith({
        TableName: 'T',
        Key: {h: 'hash', r: 123}
      }, jasmine.any(Function));

      var item = { h: 'hash', r: 123, createdAt: 1234567890, title: 'Hi', x: 2 };
      invokeCallback(client.get, null, { Item: item });
      expect(err).toBeNull();
      expect(result).toEqual(item);
    });

    it('not found item', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}}, capture);
      invokeCallback(client.get, null, {});
      expect(err.status).toEqual(404);
      expect(result).toBeUndefined();
    });

    it('not found item with AllowMissing', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}, AllowMissing: true}, capture);
      invokeCallback(client.get, null, {});
      expect(err).toBeNull();
      expect(result).toBeNull();
    });

    it('error from dynamodb', function() {
      db.table('T').get({Key: {h: 'hash', r: 123}}, capture);
      invokeCallback(client.get, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe("#batchGet", function() {
    it("gets items", function() {
      db.table('T').batchGet({Keys: [{h: 'hash', r: 123}, {h: 'sash', r: 456}]}, capture);

      expect(client.batchGet).toHaveBeenCalledWith({
        RequestItems: { 'T': { Keys: [{h: 'hash', r: 123}, {h: 'sash', r: 456}]}}
      }, jasmine.any(Function));

      var items = [{ h: 'hash', r: 123, createdAt: 111, modifiedAt: 222, title: 'Hi' },
                   { h: 'sash', r: 456, createdAt: 333, modifiedAt: 444, title: 'Bye' }];
      invokeCallback(client.batchGet, null, { Responses: { 'T': items } });
      expect(err).toBeNull();
      expect(result).toEqual(items);
    });

    it("unprocessed keys", function() {
      db.table('T').batchGet({Keys: [{h: 'hash', r: 123}, {h: 'sash', r: 456}]}, capture);

      invokeCallback(client.batchGet, null, {
        Responses: {
          'T': [{ h: 'hash', r: 123, createdAt: 111, modifiedAt: 222, title: 'Hi' }]
        },
        UnprocessedKeys: {
          'T': { Keys: [ { h: 'sash', r: 456 } ], }
        }
      });
      expect(err.status).toEqual(500);
      expect(result).toBeUndefined();
    });

    it("error from dynamodb", function() {
      db.table('T').batchGet({Keys: [{h: 'hash', r: 123}, {h: 'sash', r: 456}]}, capture);
      invokeCallback(client.batchGet, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('#put', function() {
    it('inserts new item', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}}, capture);
      expect(client.put).toHaveBeenCalledWith({
        TableName: 'T',
        Item: {
          h: 'hash',
          r: 123,
          createdAt: jasmine.any(Number),
          modifiedAt: jasmine.any(Number),
          title: 'Hello, world',
        },
        ConditionExpression: 'attribute_not_exists(createdAt)',
      }, jasmine.any(Function));

      invokeCallback(client.put, null, {});
      expect(err).toBeNull();
      expect(result.createdAt).toBeGreaterThan(_.now() - 1000);
      expect(result.createdAt).toBeLessThan(_.now() + 1000);
      expect(result).toEqual({
        h: 'hash',
        r: 123,
        createdAt: result.createdAt,
        modifiedAt: result.createdAt,
        title: 'Hello, world'
      });
    });

    it('inserts new item with AllowOverwrite', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}, AllowOverwrite: true},
        capture);
      expect(client.put).toHaveBeenCalledWith({
        TableName: 'T',
        Item: {
          h: 'hash',
          r: 123,
          createdAt: jasmine.any(Number),
          modifiedAt: jasmine.any(Number),
          title: 'Hello, world',
        },
      }, jasmine.any(Function));
    });

    it('handles conflict', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}}, capture);

      var e = new Error('Failed');
      e.name = 'ConditionalCheckFailedException';
      invokeCallback(client.put, e);
      expect(err.status).toBe(409);
      expect(result).toBeUndefined();
    });

    it('handles dynamodb error', function() {
      db.table('T').put({Item: {h: 'hash', r: 123, title: 'Hello, world'}}, capture);
      invokeCallback(client.put, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('#patch', function() {
    it('patchs item', function() {
      db.table('T').patch({Key: {h: 'hash', r: 123}, Update: {title: 'Hi', x: 2}}, capture);
      expect(client.update).toHaveBeenCalledWith({
        TableName: 'T',
        Key: { h: 'hash', r: 123 },
        ConditionExpression: 'attribute_exists(createdAt)',
        UpdateExpression: 'SET modifiedAt=:modifiedAt, #x0=:x0, #x1=:x1',
        ExpressionAttributeNames: { '#x0': 'title', '#x1': 'x' },
        ExpressionAttributeValues: { ':modifiedAt': jasmine.any(Number), ':x0': 'Hi', ':x1': 2 },
        ReturnValues: 'ALL_NEW',
      }, jasmine.any(Function));

      invokeCallback(client.update, null, {
        Attributes: {
          h: 'hash',
          r: 123,
          createdAt: 1234567890,
          modifiedAt: 2345678901,
          title: 'Hi',
          x: 2,
        }
      });
      expect(err).toBeNull();
      expect(result).toEqual({
        h: 'hash',
        r: 123,
        createdAt: 1234567890,
        modifiedAt: 2345678901,
        title: 'Hi',
        x: 2,
      });
    });

    it('handles not found', function() {
      db.table('T').patch({Key: {h: 'hash', r: 123}, Update: {title: 'Hi', x: 2}}, capture);
      var e = new Error('Failed');
      e.name = 'ConditionalCheckFailedException';
      invokeCallback(client.update, e);
      expect(err.status).toEqual(404);
    });

    it('handles dynamodb error', function() {
      db.table('T').patch({Key: {h: 'hash', r: 123}, Update: {title: 'Hi', x: 2}}, capture);
      invokeCallback(client.update, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('increment', function() {
    it('increments fields', function() {
      db.table('T').increment({Key: {h: 'hash', r: 123}, Amount: {foo: 2, bar: -1}}, capture);
      expect(client.update).toHaveBeenCalledWith({
        TableName: 'T',
        Key: { h: 'hash', r: 123 },
        ConditionExpression: 'attribute_exists(createdAt)',
        UpdateExpression: 'SET modifiedAt=:modifiedAt ADD #x0 :x0, #x1 :x1',
        ExpressionAttributeNames: { '#x0': 'foo', '#x1': 'bar' },
        ExpressionAttributeValues: { ':modifiedAt': jasmine.any(Number), ':x0': 2, ':x1': -1 },
        ReturnValues: 'ALL_NEW'
      }, jasmine.any(Function));

      invokeCallback(client.update, null, {Attributes: { modifiedAt: 12345, foo: 7, bar: -10 }});
      expect(err).toBeNull();
      expect(result).toEqual({ foo: 7, bar: -10 });
    });

    it('handles not found', function() {
      db.table('T').increment({Key: {h: 'hash', r: 123}, Amount: {foo: 2}}, capture);
      var e = new Error('Failed');
      e.name = 'ConditionalCheckFailedException';
      invokeCallback(client.update, e);
      expect(err.status).toEqual(404);
    });

    it('handles dynamodb error', function() {
      db.table('T').increment({Key: {h: 'hash', r: 123}, Amount: {foo: 2}}, capture);
      invokeCallback(client.update, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe('#delete', function() {
    it('deletes item', function() {
      db.table('T').delete({Key: {h: 'hash', r: 123}}, capture);
      expect(client.delete).toHaveBeenCalledWith({
        TableName: 'T',
        Key: {h: 'hash', r: 123},
      }, jasmine.any(Function));

      invokeCallback(client.delete, null, {});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it('handles dynamodb error', function() {
      db.table('T').delete({Key: {h: 'hash', r: 123}}, capture);
      invokeCallback(client.delete, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe("ACL#get", function() {
    it("gets permissions", function() {
      db.acl('A').get({User: 'user123', Resource: 'album:abc'}, capture);
      expect(client.get).toHaveBeenCalledWith({
        TableName: 'A', Key: {userID: 'user123', res: 'album:abc'}
      }, jasmine.any(Function));

      invokeCallback(client.get, null, {Item: {userID: 'user123', res: 'album:abc', r: 1}});
      expect(err).toBeNull();
      expect(result).toEqual({userID: 'user123', res: 'album:abc', r: 1});
    });

    it("handles not found permission", function() {
      db.acl('A').get({User: 'user123', Resource: 'album:abc'}, capture);
      invokeCallback(client.get, null, {});
      expect(err).toBeNull();
      expect(result).toEqual({userID: 'user123', res: 'album:abc'});
    });

    it("handles dynamodb error", function() {
      db.acl('A').get({User: 'user123', Resource: 'album:abc'}, capture);
      invokeCallback(client.get, new Error('Failed'));
      expect(err.message).toEqual('Failed');
      expect(result).toBeUndefined();
    });
  });

  describe("ACL#check", function() {
    it("passing case", function() {
      db.acl('A').check({User: 'u', Resource: 'album:abc', Permissions: ['w']}, capture);
      expect(client.get).toHaveBeenCalledWith({
        TableName: 'A', Key: { userID: 'u', res: 'album:abc' }
      }, jasmine.any(Function));
      invokeCallback(client.get, null, {Item: { userID: 'u', res: 'album:abc', r: 1, w: 1 }});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it("failing case", function() {
      db.acl('A').check({User: 'u', Resource: 'album:abc', Permissions: ['r', 'w']},
        capture);
      invokeCallback(client.get, null, {Item: { userID: 'user123', res: 'album:abc', r: 1 }});
      expect(err.status).toEqual(403);
    });

    it("handles dynamodb error", function() {
      db.acl('A').check({User: 'u', Resource: 'album:abc', Permissions: ['w']}, capture);
      invokeCallback(client.get, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe("ACL#grant", function() {
    it("grants permissions", function() {
      db.acl('A').grant({User: 'u', Resource: 'album:abc', Permissions: ['r', 'w']},
        capture);
      expect(client.update).toHaveBeenCalledWith({
        TableName: 'A',
        Key: { userID: 'u', res: 'album:abc' },
        UpdateExpression: 'SET #p0=:p0, #p1=:p1',
        ExpressionAttributeNames: { '#p0': 'r', '#p1': 'w' },
        ExpressionAttributeValues: { ':p0': 1, ':p1': 1 },
      }, jasmine.any(Function));
      invokeCallback(client.update, null, {});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it("handles dynamodb error", function() {
      db.acl('A').grant({User: 'u', Resource: 'album:abc', Permissions: ['w']}, capture);
      invokeCallback(client.update, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe("ACL#revoke", function() {
    it("revokes permissions", function() {
      db.acl('A').revoke({User: 'u', Resource: 'album:abc'}, capture);
      expect(client.delete).toHaveBeenCalledWith({
        TableName: 'A', Key: { userID: 'u', res: 'album:abc' }
      }, jasmine.any(Function));
      invokeCallback(client.delete, null, {});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it("handles dynamodb error", function() {
      db.acl('A').revoke({User: 'u', Resource: 'album:abc'}, capture);
      invokeCallback(client.delete, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe("ACL#revokeAll", function() {
    it("revokes single permission", function() {
      var grants = [ { userID: 'user123', res: 'album:abc', r: 1 } ];
      db.acl('A').revokeAll({Resource: 'album:abc'}, capture);

      invokeCallback(client.query, null, { Items: grants });
      expect(client.batchWrite).toHaveBeenCalledWith({
        RequestItems: {'A': [{ DeleteRequest: { Key: { userID: 'user123', res: 'album:abc' }}}]}
      }, jasmine.any(Function));

      invokeCallback(client.batchWrite, null, {});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it("revokes multiple batches of permissions in parallel", function() {
      var grants = [];
      var firstBatch = [];
      for (var i = 0; i < 27; i++) {
        grants.push({ userID: 'user' + i, res: 'album:abc', r: 1});
        if (i < 25) {
          firstBatch.push({ DeleteRequest: { Key: { userID: 'user' + i, res: 'album:abc' }}});
        }
      }
      db.acl('A').revokeAll({Resource: 'album:abc'}, capture);

      invokeCallback(client.query, null, { Items: grants });
      expect(client.batchWrite).toHaveBeenCalledWith({ RequestItems: { 'A': firstBatch }},
        jasmine.any(Function));

      // Explicitly check the second batch to guard against bugs in the test:
      expect(client.batchWrite).toHaveBeenCalledWith({
        RequestItems: {
          'A': [
            { DeleteRequest: { Key: { userID: 'user25', res: 'album:abc' }}},
            { DeleteRequest: { Key: { userID: 'user26', res: 'album:abc' }}},
          ]
        }
      }, jasmine.any(Function));
      client.batchWrite.calls.argsFor(0)[1](undefined, {});
      client.batchWrite.calls.argsFor(1)[1](undefined, {});
      expect(err).toBeNull();
      expect(result).toBeUndefined();
    });

    it("handles dynamodb error in get", function() {
      db.acl('A').revokeAll({Resource: 'album:abc'}, capture);
      invokeCallback(client.query, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });

    it("handles dynamodb error in batchWrite", function() {
      var grants = [ { userID: 'user123', res: 'album:abc', r: 1 } ];
      db.acl('A').revokeAll({Resource: 'album:abc'}, capture);
      invokeCallback(client.query, null, { Items: grants });
      invokeCallback(client.batchWrite, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });

    it("handles unprocessed items as error", function() {
      var grants = [ { userID: 'user123', res: 'album:abc', r: 1 } ];
      db.acl('A').revokeAll({Resource: 'album:abc'}, capture);
      invokeCallback(client.query, null, { Items: grants });
      invokeCallback(client.batchWrite, null, {
        UnprocessedItems: {
          'A':  [{ DeleteRequest: { Key: { userID: 'user123', res: 'album:abc' }}}]
        }
      });
      expect(err.status).toEqual(500);
      expect(err.message).toContain('Unprocessed Items');
    });
  });

  describe("ACL#grantsForUser", function() {
    it("returns grants", function() {
      db.acl('A').grantsForUser({User: 'user123'}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'A',
        KeyConditionExpression: 'userID=:userID',
        ExpressionAttributeValues: { ':userID': 'user123' },
        ConsistentRead: true,
        ScanIndexForward: false,
        Limit: 10,
      }, jasmine.any(Function));

      var grants = [
        { userID: 'user123', res: 'album:abc', r: 1 },
        { userID: 'user123', res: 'album:zyxw', r: 1, w: 1 },
      ];
      invokeCallback(client.query, null, { Items: grants });
      expect(err).toBeNull();
      expect(result).toEqual(grants);
    });

    it("handles limit and max resource", function() {
      db.acl('A').grantsForUser({User: 'user123', Limit: 2, MaxResource: 'album:zzz'}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'A',
        KeyConditionExpression: 'userID=:userID AND res<=:maxResource',
        ExpressionAttributeValues: { ':userID': 'user123', ':maxResource': 'album:zzz' },
        ConsistentRead: true,
        ScanIndexForward: false,
        Limit: 2,
      }, jasmine.any(Function));
    });

    it("handles min resource", function() {
      db.acl('A').grantsForUser({User: 'user123', MinResource: 'album:'}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'A',
        KeyConditionExpression: 'userID=:userID AND res>=:minResource',
        ExpressionAttributeValues: { ':userID': 'user123', ':minResource': 'album:' },
        ConsistentRead: true,
        ScanIndexForward: false,
        Limit: 10,
      }, jasmine.any(Function));
    });

    it("handles min resource and max resource", function() {
      db.acl('A').grantsForUser({User: 'user123', MinResource: 'album:', MaxResource: 'album:zzz'},
        capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'A',
        KeyConditionExpression: 'userID=:userID AND res BETWEEN :minResource AND :maxResource',
        ExpressionAttributeValues: {
          ':userID': 'user123',
          ':minResource': 'album:',
          ':maxResource': 'album:zzz',
        },
        ConsistentRead: true,
        ScanIndexForward: false,
        Limit: 10,
      }, jasmine.any(Function));
    });

    it("handles dynamodb error", function() {
      db.acl('A').grantsForUser({User: 'user123'}, capture);
      invokeCallback(client.query, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });

  describe("ACL#grantsForResource", function() {
    it("returns grants", function() {
      db.acl('A').grantsForResource({Resource: 'album:abc'}, capture);
      expect(client.query).toHaveBeenCalledWith({
        TableName: 'A',
        IndexName: 'by-resource',
        KeyConditionExpression: 'res=:res',
        ExpressionAttributeValues: { ':res': 'album:abc' },
        ConsistentRead: false,
        ScanIndexForward: true,
      }, jasmine.any(Function));
      var grants = [
        { userID: 'user123', res: 'album:abc', r: 1 },
        { userID: 'user123', res: 'album:abc', r: 1, w: 1 },
      ];
      invokeCallback(client.query, null, { Items: grants });
      expect(err).toBeNull();
      expect(result).toEqual(grants);
    });

    it("handles dynamodb error", function() {
      db.acl('A').grantsForResource({Resource: 'album:abc'}, capture);
      invokeCallback(client.query, new Error('Failed'));
      expect(err.message).toEqual('Failed');
    });
  });
});

/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "y9u17pe3989fqlw",
    "created": "2026-07-19 15:57:16.855Z",
    "updated": "2026-07-19 15:57:16.855Z",
    "name": "video_interactions",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "zsextszk",
        "name": "video_id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": true,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "2zq6avfy",
        "name": "title",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "a9oc9nhu",
        "name": "channel",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "70dgfr5m",
        "name": "action",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": "",
    "updateRule": "",
    "deleteRule": "",
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("y9u17pe3989fqlw");

  return dao.deleteCollection(collection);
})

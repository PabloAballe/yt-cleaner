/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "9t8giwr4l976k6f",
    "created": "2026-07-19 15:57:16.885Z",
    "updated": "2026-07-19 15:57:16.885Z",
    "name": "app_settings",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "8jyxrgva",
        "name": "key",
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
        "id": "pkuf6vlh",
        "name": "value",
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
  const collection = dao.findCollectionByNameOrId("9t8giwr4l976k6f");

  return dao.deleteCollection(collection);
})

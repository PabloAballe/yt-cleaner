/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "acx67uuos7u8u05",
    "created": "2026-07-19 15:57:16.865Z",
    "updated": "2026-07-19 15:57:16.865Z",
    "name": "channel_weights",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "u4463smr",
        "name": "channel",
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
        "id": "kptmk7wd",
        "name": "weight",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
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
  const collection = dao.findCollectionByNameOrId("acx67uuos7u8u05");

  return dao.deleteCollection(collection);
})

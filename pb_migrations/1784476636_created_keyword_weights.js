/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "r108eixh2buayjt",
    "created": "2026-07-19 15:57:16.873Z",
    "updated": "2026-07-19 15:57:16.873Z",
    "name": "keyword_weights",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "mv5dimk5",
        "name": "keyword",
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
        "id": "jtwbxn5o",
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
  const collection = dao.findCollectionByNameOrId("r108eixh2buayjt");

  return dao.deleteCollection(collection);
})

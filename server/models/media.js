/**
 * Narengi Media Model: Handle Image Actions
 * @author Aref Mirhosseini <code@arefmirhosseini.com> (http://arefmirhosseini.com)
 * @update Thu Dec. 17 2016
 */

'use strict'

const loopBackContext = require('loopback-context'),
  app = serverRequire('server'),
  configs = app.settings,
  MainHandler = require('../Handlers/Main'),
  Http = require('narengi-utils').Http,
  lwip = require('lwip'),
  async = require('async'),
  crypto = require('crypto'),
  fs = require('fs'),
  mime = require('mime'),
  googleMaps = require('googlemaps'),
  debug = require('debug'),
  ObjectID = require('mongodb').ObjectID,
  _ = require('lodash');

class Medias extends MainHandler {

  /**
   * Main Class Constructor
   */
  constructor(Media) {
    super(Media)
      // Register Methods
    this.UploadMedias();
    this.GetMedia();
    this.GetProfileAvatars();
    this.GetProfileAvatar();
    this.GetHouseMedias();
    this.GetMyMedias();
    this.SetMedia();
    // this.UnsetMedia(); // use RemoveMedia instead
    this.RemoveMedia();
    this.GoogleMapForHouse();
    this.getFeatureIcon();
    this.getSiteImages();
  }

  /**
   * Upload Single/Multiple Images
   * @url /v1/medias/upload/:section/:id?
   * @method POST
   * @param {string} section
   * @param {objectid} id
   * @body {fileobject} files
   * @return {object} result
   */
  UploadMedias() {
    this.registerMethod({
      name: 'UploadMedias',
      description: 'upload new medias',
      path: '/upload/:section/:id?',
      method: 'post',
      status: 201,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      returns: {
        arg: 'result',
        type: 'object'
      }
    }, this.upload.bind(this));
  }

  /**
   * Get/Download Images
   * @url /v1/medias/get/:uid
   * @method GET
   * @param {uuidv4} uid
   * @return {fileobject}
   */
  GetMedia() {
    this.registerMethod({
      name: 'GetMedia',
      description: 'get medias',
      path: '/get/:uid',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'ctx',
        type: 'object',
        http: {
          source: 'context'
        }
      }],
      returns: [
        { type: 'ReadableStream', root: true },
        { arg: 'Content-Type', type: 'string', http: { target: 'header' } },
        { arg: 'Content-Length', type: 'string', http: { target: 'header' } }
      ]
    }, this.download.bind(this));
  }

  /**
   * Get Profile Images
   * @url /v1/medias/avatars
   * @method GET
   * @return {object}
   */
  GetProfileAvatars() {
    this.registerMethod({
      name: 'GetProfileAvatars',
      description: 'get all user profile avatars',
      path: '/avatars',
      method: 'get',
      status: 200,
      accepts: [],
      returns: {
        arg: 'result',
        type: 'object',
        root: true
      }
    }, this.getAvatars.bind(this));
  }

  /**
   * Get Last Profile Image
   * @url /v1/medias/avatar
   * @method GET
   * @return {object}
   */
  GetProfileAvatar() {
    this.registerMethod({
      name: 'GetProfileAvatar',
      description: 'get user profile avatar',
      path: '/avatar/:uid?',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }, {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res'
        }
      }],
      returns: [
        { type: 'ReadableStream', root: true },
        { arg: 'Content-Type', type: 'string', http: { target: 'header' } },
        { arg: 'Content-Length', type: 'string', http: { target: 'header' } }
      ]
    }, this.getAvatar.bind(this));
  }

  /**
   * Get House Images
   * @url /v1/medias/house/:houseid
   * @method GET
   * @param {objectid} houseid
   * @return {object} result
   */
  GetHouseMedias() {

    let Settings = {
      name: 'GetHouseMedias',
      description: 'get house medias',
      path: '/house/:houseid',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      returns: {
        arg: 'result',
        type: 'object'
      }
    }

    this.registerMethod(Settings, (req, cb) => {

      const houseid = req.params.houseid;
      let ctx = loopBackContext.getCurrentContext();
      let currentUser = ctx && ctx.get('currentUser');

      async.waterfall([
        (callback) => {
          this.Model.find({
              where: {
                assign_type: "house",
                assign_id: ObjectID(houseid),
                is_private: false,
                deleted: false
              },
              fields: [
                'uid',
                'type',
                'size',
                'created_date'
              ],
              limit: 10,
              order: '_id DESC'
            })
            .then((medias) => callback(null, medias))
            .catch((err) => callback(err))
        }
      ], (err, medias) => {
        if (!err) {
          cb(null, {
            info: {
              total: medias.length
            },
            data: medias
          })
        } else cb(err)
      });

      return cb.promise;
    });
  }

  /**
   * Get Current User Uploaded Medias
   * @url /v1/medias
   * @method GET
   */
  GetMyMedias() {

    let Settings = {
      name: 'GetMyMedias',
      description: 'get currentUser medias',
      path: '/',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }, {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res'
        }
      }],
      returns: {
        arg: 'result',
        type: 'object'
      }
    }

    this.registerMethod(Settings, (req, res, cb) => {

      // pagination settings
      const qs = req.query;
      const type = qs.type && _.has(configs, qs.type) ? qs.type : null;
      const perpage = qs.perpage && qs.perpage >= 3 && qs.perpage <= 25 ? qs.perpage : 10;
      const page = qs.page && qs.page > 0 ? qs.page : 1;
      const time = qs.time;
      const timeConjuction = _.has(qs, 'after') ? 'after' : _.has(qs, 'before') ? 'before' : null;
      const paginationMethod = timeConjuction ? 'time-conjuction' : 'normal';

      const mediaDebugger = debug('narengi-media:get-my-medias')

      let ctx = loopBackContext.getCurrentContext();
      let currentUser = ctx && ctx.get('currentUser');
      if (!currentUser) this.Error({ status: 401, message: 'Unauthorized' }, cb);

      mediaDebugger('qs', perpage)

      async.waterfall([
        (callback) => {
          let query = {
            where: {
              owner_id: currentUser.id,
              deleted: false
            },
            fields: [
              'uid',
              'type',
              'size',
              'assign_type',
              'assign_id',
              'is_private',
              'created_date'
            ],
            limit: perpage
          }
          if (type) {
            query.where.assign_type = type;
          }

          if (paginationMethod === 'normal') {
            let skip = (page - 1) * query.limit;
            query.skip = skip >= 0 ? skip : 0;
          } else {
            if (timeConjuction === 'after') {
              query.where.created_date = {
                $gt: new ISODate(time)
              }
            } else {
              query.where.created_date = {
                $lt: new ISODate(time)
              }
            }
          }

          this.Model.find(query)
            .then((medias) => callback(medias ? null : {
              status: 404,
              message: 'not found'
            }, medias))
            .catch((err) => callback(err))
        }
      ], (err, medias) => {
        if (!err) {
          cb(medias.length ? null : {
            status: 204,
            message: 'there isn\'t any media on this range'
          }, medias.length ? {
            info: {
              page: paginationMethod === 'normal' ? Number(page) : 'base-on-time-conjection',
              perPage: Number(perpage)
            },
            data: medias
          } : null)
        } else cb(err)
      });

      return cb.promise;
    });
  }

  /**
   * Set/Assign Media to House or UserProfile
   * @url /v1/medias/set
   * @method PUT
   * @body {uuidv4} uid
   * @body {id} house id / userprofile id
   * @return {object} result
   */
  SetMedia() {

    let Settings = {
      name: 'SetMedia',
      description: 'assign medias to specified content',
      path: '/set',
      method: 'put',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      returns: {
        arg: 'result',
        type: 'object'
      }
    }

    this.registerMethod(Settings, (req, cb) => {

      const uid = req.body.uid;
      const cid = req.body.id;
      let ctx = loopBackContext.getCurrentContext();
      let currentUser = ctx && ctx.get('currentUser');
      if (!currentUser) cb({ status: 401, message: 'Unauthorized' })

      async.waterfall([
        (callback) => {
          // GET MEDIA
          this.Model.findOne({
              where: {
                uid: uid,
                owner_id: currentUser.id,
                deleted: false
              }
            })
            .then((media) => callback(media ? null : { status: 404, message: 'not found' }, media))
            .catch((err) => callback(err))
        },
        (media, callback) => {
          // CHECK IF ASSIGNED ID IS FOR CONTENT WITH SAME TYPE
          if (media.assign_type === 'userprofile') {
            callback(null, currentUser.id);
          } else {
            let contCfg = configs[media.assign_type].picture;
            app.models[contCfg.model].findOne({
                where: {
                  id: cid,
                  $or: [
                    { ownerId: currentUser.personId },
                    { personId: currentUser.personId }
                  ]
                }
              })
              .then((data) => callback(data ? null : 'not-found', media, data.id))
              .catch((err) => callback(err))
          }
        },
        (media, assign_id, callback) => {
          media.updateAttribute('assign_id', assign_id, callback);
        }
      ], (err, result) => {
        if (!err)
          cb(null, {
            message: 'assigned'
          })
        else
          cb(err)
      });

      return cb.promise;
    });
  }

  /**
   * Unset/Unassign Medias From Houses -- DEPRECTED SERVICE, USE RemoveMedia INSTEAD
   * @url /v1/medias/unset
   * @method PUT
   */
  UnsetMedia() {

    let Settings = {
      name: 'UnsetMedia',
      description: 'unset medias from specified content',
      path: '/unset',
      method: 'put',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      returns: {
        arg: 'result',
        type: 'object'
      }
    }

    this.registerMethod(Settings, (req, cb) => {

      const uid = req.body.uid; // media id
      let ctx = loopBackContext.getCurrentContext();
      let currentUser = ctx && ctx.get('currentUser');
      if (!currentUser) cb({ status: 401, message: 'Unauthorized' })

      async.waterfall([
        (callback) => {
          // GET MEDIA
          this.Model.findOne({
              where: {
                uid: uid,
                owner_id: currentUser.id,
                deleted: false
              }
            })
            .then((media) => {
              callback(media ? null : {
                status: 404
              }, media ? media : null)
            })
            .catch((err) => callback(err))
        },
        (media, callback) => {
          media.updateAttribute('assign_id', null, callback);
        }
      ], (err, result) => {
        if (!err)
          cb(null, {
            message: 'unassigned'
          })
        else
          cb(err)
      });

      return cb.promise;
    });
  }

  /**
   * Remove/Delete Media (Images)
   * @url /v1/medias/remove/:uid
   * @method DELETE
   * @param {uuidv4} uid
   * @return {object} result
   */
  RemoveMedia() {

    let Settings = {
      name: 'RemoveMedia',
      description: 'remove medias from specified content',
      path: '/remove/:uid',
      method: 'delete',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }],
      returns: {
        arg: 'result',
        type: 'object'
      }
    }

    this.registerMethod(Settings, (req, cb) => {

      const uid = req.params.uid; // media id
      let ctx = loopBackContext.getCurrentContext();
      let currentUser = ctx && ctx.get('currentUser');
      if (!currentUser) cb({ status: 401, message: 'Unauthorized' })

      async.waterfall([
        (callback) => {
          // GET MEDIA
          this.Model.findOne({
              where: {
                uid: uid,
                owner_id: ObjectID(currentUser.id),
                deleted: false
              }
            })
            .then((media) => callback(media ? null : {
              status: 404
            }, media ? media : null))
            .catch((err) => callback(err))
        },
        (media, callback) => {
          media.updateAttribute('deleted', true, callback);
        }
      ], (err, result) => {
        if (!err)
          cb(null, {
            message: 'removed'
          })
        else
          cb(err)
      });

      return cb.promise;
    });
  }

  /**
   * Generate Google Maps Image from House Geo-Position
   * @url /v1/medias/googlemap/house/:houseid
   * @method GET
   * @param {string} houseid
   * @return {fileobject} image
   */
  GoogleMapForHouse() {

    let Settings = {
      name: 'GoogleMapForHouse',
      description: 'Generate Google Maps Image from House Geo-Position',
      path: '/googlemap/house/:houseid',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'req',
        type: 'object',
        http: {
          source: 'req'
        }
      }, {
        arg: 'res',
        type: 'object',
        http: {
          source: 'res'
        }
      }],
      returns: {
        arg: 'fileobject',
        type: 'object',
        root: true
      }
    }

    this.registerMethod(Settings, (req, res, cb) => {

      const houseid = req.params.houseid,
        imgsize = req.query.size || '500x200';

      async.waterfall([
        (callback) => {
          // GET HOUSE
          app.models.House.findById(houseid)
            .then((house) => {
              let posVals = _.values(house.position);
              posVals = posVals.splice(posVals.length - 2);
              if (posVals.length) callback(null, posVals);
              else callback('house does not have coordinates');
            });
        },
        (pos, callback) => {
          let gm = new googleMaps({
            key: "AIzaSyCiLAqll37o6D3ZY-wUw7i_GPrcUQ3owFE"
          });
          let params = {
            // center: pos.join(', '),
            zoom: 15,
            size: imgsize,
            maptype: 'roadmap',
            markers: [{
              location: pos.join(', '),
              icon: 'http://amirhassan.com/circle.png'
            }],
            path: [{
              color: '0x0000ff',
              weight: '5',
              points: [pos.join(', ')]
            }]
          };

          let imgUrl = gm.staticMap(params)
          callback(null, imgUrl);
        }
      ], (err, imgUrl) => {
        if (err) {
          cb({ status: 404, message: err })
        } else {
          res.redirect(imgUrl)
        }
      });

      return cb.promise;
    });
  }

  /**
   * Upload Medias Handler
   * @param  {object}  req
   * @param  {promise} cb 
   * @return {object}
   */
  upload(req, cb) {
    const uploadDebugger = debug('narengi-media:upload')
    this.startTime = Date.now();
    uploadDebugger(`request params:`, req.params, this.Memory)

    const Storage = app.models.Storage;
    let container = req.params.section.trim();
    let cid = req.params.id ? req.params.id : null;
    let contcfg = _.has(configs, container) ? configs[container].picture : {};
    let ctx = loopBackContext.getCurrentContext();
    let currentUser = ctx && ctx.get('currentUser');
    if (!currentUser) this.Error({ status: 401, message: 'Unauthorized' }, cb);

    // VALIDATE CONFIGS
    switch (true) {
      case !Object.keys(contcfg).length:
        uploadDebugger(`validation failed: invalid 'contcfg' object keys length for ${container}`, this.Memory)
        this.Error({
          status: 400,
          code: 'validation failed',
          message: `invalid section '${container}'`
        }, cb)
        break;
      case !_.has(contcfg, 'dirName') || !contcfg.dirName.trim().length:
        uploadDebugger(`validation failed: 'contcfg' not include required key 'dirName'`, this.Memory)
        this.Error({
          status: 400,
          code: 'validation failed',
          message: `invalid configuration for '${container}'`
        }, cb)
        break;
      case !_.has(contcfg, 'maxSize') || typeof contcfg.maxSize !== "number":
        uploadDebugger(`validation failed: 'contcfg' not include required key 'maxSize'`, this.Memory)
        this.Error({
          status: 400,
          code: 'validation failed',
          message: `invalid configuration for '${container}'`
        }, cb)
        break;
      case !_.has(contcfg, 'key') || !contcfg.key.trim().length:
        uploadDebugger(`validation failed: 'contcfg' not include required key 'key'`, this.Memory)
        this.Error({
          status: 400,
          code: 'validation failed',
          message: `invalid configuration for '${container}'`
        }, cb)
        break;
      case !_.has(contcfg, 'model') || !contcfg.model.trim().length:
        uploadDebugger(`validation failed: 'contcfg' not include required key 'model'`, this.Memory)
        this.Error({
          status: 400,
          code: 'validation failed',
          message: `invalid configuration for '${container}'`
        }, cb)
        break;
    }

    async.waterfall([
      (callback) => {
        // CHECK IF CONTAINER IS EXISTS
        uploadDebugger('CHECK IF CONTAINER IS EXISTS', this.Memory);
        Storage.getContainer(contcfg.dirName, callback)
      },
      // (cont, callback) => {
      //   // CREATE CONTAINER IF IT IS NOT EXISTS
      //   uploadDebugger('CREATE CONTAINER IF IT IS NOT EXISTS');
      //   switch (cont) {
      //     case 'OK':
      //       callback(null)
      //       break;
      //     case 'ENOENT':
      //       Storage.createContainer({ name: contcfg.dirName }, () => callback(null))
      //       break;
      //   }
      // },
      (cont, callback) => {
        // GET FILE DATA FROM REQUEST
        uploadDebugger('GET FILE DATA FROM REQUEST', this.Memory);
        Http.Uploader.mediaUpload(req, callback);
      },
      (fileds, formData, callback) => {
        // VALIDATE FILE BASE ON CONTAINER CONFIGS
        uploadDebugger('VALIDATE FILE BASE ON CONTAINER CONFIGS', this.Memory);
        let isValid = true;
        let files = [];

        let formDataType = Object.prototype.toString.call(formData.files);
        formDataType = formDataType.substr(formDataType.indexOf(' ') + 1, 3).toLowerCase();

        formData.files = formDataType === 'obj' ? [formData.files] : formData.files;

        _.each(formData.files, (file, idx) => {
          isValid = isValid && file.type.substring(0, file.type.indexOf('/')) === "image";
          uploadDebugger(`check file type: ${file.type.substring(0, file.type.indexOf('/'))} = ${isValid}`, this.Memory)
          if (!isValid) {
            uploadDebugger(`invalid uploaded file type '${file.type.substring(0, file.type.indexOf('/'))}'`, this.Memory)
            this.Error({
              status: 400,
              code: 'validation failed',
              message: `invalid uploaded file type '${file.type.substring(0, file.type.indexOf('/'))}'`
            }, cb);
          }

          isValid = isValid && Number(file.size) <= contcfg.maxSize;
          uploadDebugger(`check file size: ${Number(file.size)}/${contcfg.maxSize} = ${isValid}`, this.Memory)
          if (!isValid) {
            uploadDebugger('maximum uploaded file size exceeds', this.Memory)
            this.Error({
              status: 400,
              code: 'validation failed',
              message: 'maximum uploaded file size exceeds'
            }, cb);
          }
          if (currentUser && currentUser.id) {
            files.push({
              hash: crypto.createHmac('md5', `${contcfg.key}=${currentUser.id}`).update(file.path).digest('hex'),
              path: file.path,
              size: file.size,
              type: file.type,
              ext: file.type.substr(file.type.indexOf('/') + 1),
              owner_id: currentUser.id,
              assign_type: container,
              storage: contcfg.dirName
            })
          }
        });

        callback(files.length ? null : {
          status: 400
        }, files.length ? files : null);
      },
      (files, callback) => {
        // CREATE IMAGE OBJECTS FROM FILES
        uploadDebugger('CREATE IMAGE OBJECTS FROM FILES', this.Memory);
        let idx = 0;
        _.each(files, (file) => {
          lwip.open(file.path, (err, img) => {
            img.writeFile(`./storage/${contcfg.dirName}/${file.hash}`, file.ext, {}, () => {});
            // if (idx < files.length - 1) idx++;
            // else callback(null, files);
          })
        });
        callback(null, files);
      },
      // (files, callback) => {
      //   // WRITE FILES
      //   let idx = 0;
      //   _.each(files, (file) => {
      //     file.img.writeFile(`./storage/${contcfg.dirName}/${file.hash}`, file.ext, {}, () => {
      //       if (idx < files.length - 1) idx++;
      //       else callback(null, files);
      //     });
      //   });
      // },
      (files, callback) => {
        // SAVE FILE TO DB
        uploadDebugger('SAVE FILES TO DB', this.Memory);
        let uploaded = [];
        let idx = 0;

        _.each(files, (file) => {
          delete file.img;
          delete file.path;
          if (file.assign_type === 'house' && cid) {
            file.assign_id = ObjectID(cid);
          }
          if (file.assign_type === 'userprofile') {
            file.assign_id = ObjectID(currentUser.id);
          }
        });
        this.Model.create(files, callback);
      }
    ], (err, result) => {
      // DONE
      if (!err) {
        uploadDebugger('DONE', this.Memory)
        _.map(result, (d, idx) => {
          result[idx] = _.valuesIn(_.pick(d, 'uid'))[0];
        })
        cb(null, {
          uids: result,
          message: `${result.length} images uploaded`
        })
      } else {
        uploadDebugger('ERR', this.Memory)
        cb(err)
      }
    });

    return cb.promise
  }

  /**
   * Download Media Handler for GetMedia Method
   * @param  {object}   req
   * @param  {object}   res
   * @param  {promise} cb
   * @return {file}
   */
  download(ctx, cb) {
    const uid = ctx.req.params.uid;
    let userctx = loopBackContext.getCurrentContext();
    let currentUser = userctx && userctx.get('currentUser');

    async.waterfall([
      (callback) => {
        this.Model.findOne({
          where: {
            uid: uid,
            deleted: false
          },
          fields: ['hash', 'type', 'size', 'owner_id', 'storage', 'is_private']
        }, callback);
      },
      (media, callback) => {
        if (!media) return callback({ status: 404, message: 'MEDIA_NOT_FOUND' });
        if (media.is_private) {
          if (currentUser && ObjectID(currentUser.id) === ObjectID(currentUser.owner_id)) {
            callback(null, media);
          } else {
            callback({ status: 403, message: 'ACCESS_DENIED' });
          }
        } else {
          callback(null, media);
        }
      }
    ], (err, media) => {
      if (err) {
        cb(err);
      } else {
        ctx.res.setHeader('Content-Type', media.type);
        ctx.res.setHeader('Content-Length', fs.statSync(`./storage/${media.storage}/${media.hash}`).size);
        let readStream = fs.createReadStream(`./storage/${media.storage}/${media.hash}`);
        readStream.pipe(ctx.res);
      }
    });

    return cb.promise;
  }

  /**
   * Get Current USer Avatars
   * @return {object}
   */
  getAvatars(cb) {

    let ctx = loopBackContext.getCurrentContext();
    let currentUser = ctx && ctx.get('currentUser');
    if (!currentUser) this.Error({ status: 401, message: 'Unauthorized' }, cb);

    this.Model.find({
        where: {
          owner_id: ObjectID(currentUser.id),
          assign_type: 'userprofile',
          deleted: false
        },
        fields: ['uid', 'is_private', 'created_date'],
        order: '_id DESC'
      })
      .then((medias) => {
        _.map(medias, (media) => {
          media.url = `/medias/get/${media.uid}`
        })
        cb(null, {
          data: medias
        })
      })

    return cb.promise;
  }

  /**
   * Get Current User Avatar
   * @return {fileobject}
   */
  getAvatar(req, res, cb) {

    let uid = req.params.uid || null;
    let ctx = loopBackContext.getCurrentContext();
    let currentUser = ctx && ctx.get('currentUser');

    this.Model.findOne({
        where: {
          owner_id: uid ? ObjectID(uid) : ObjectID(currentUser.id),
          assign_type: 'userprofile',
          deleted: false
        },
        fields: ['uid', 'type', 'owner_id', 'storage', 'hash', 'is_private']
      })
      .then((media) => {
        if (media) {
          if (!media.is_private || currentUser && String(currentUser.id) === String(media.owner_id)) {
            res.setHeader('Content-Type', media.type);
            res.setHeader('Content-Length', fs.statSync(`./storage/${media.storage}/${media.hash}`).size);
            let readStream = fs.createReadStream(`./storage/${media.storage}/${media.hash}`);
            readStream.pipe(res);
          } else {
            cb({ status: 403, message: 'access denied' })
          }
        } else {
          cb({ status: 404, message: 'not found' })
        }
      });

    return cb.promise;
  }

  getFeatureIcon() {

    this.registerMethod({
      name: 'GetFeatureIcon',
      description: 'get feature icon',
      path: '/feature/:code',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'ctx',
        type: 'object',
        http: {
          source: 'context'
        }
      }],
      returns: [
        { type: 'ReadableStream', root: true },
        { arg: 'Content-Type', type: 'string', http: { target: 'header' } },
        { arg: 'Content-Length', type: 'string', http: { target: 'header' } }
      ]
    }, (ctx, cb) => {

      const Storage = app.models.Storage;
      const iconPath = `./storage/feature-icons/${ctx.req.params.code}.png`;

      Storage.getFile('feature-icons', `${ctx.req.params.code}.png`, (err, file) => {
        if (err) {
          return cb({ status: 404, message: err.code });
        }
        ctx.res.setHeader('Content-Type', mime.lookup(iconPath));
        ctx.res.setHeader('Content-Length', fs.statSync(iconPath).size);
        let readStream = fs.createReadStream(iconPath);
        readStream.pipe(ctx.res);
      })

      return cb.promise;
    });
  }

  getSiteImages() {

    this.registerMethod({
      name: 'GetSiteImages',
      description: 'get feature icon',
      path: '/site/:code',
      method: 'get',
      status: 200,
      accepts: [{
        arg: 'ctx',
        type: 'object',
        http: {
          source: 'context'
        }
      }],
      returns: [
        { type: 'ReadableStream', root: true },
        { arg: 'Content-Type', type: 'string', http: { target: 'header' } },
        { arg: 'Content-Length', type: 'string', http: { target: 'header' } }
      ]
    }, (ctx, cb) => {

      const Storage = app.models.Storage;
      const imgPath = `./storage/site-images/${ctx.req.params.code}.png`;

      Storage.getFile('site-images', `${ctx.req.params.code}.png`, (err, file) => {
        if (err) {
          return cb({ status: 404, message: err.code });
        }
        ctx.res.setHeader('Content-type', mime.lookup(imgPath));
        ctx.res.setHeader('Content-Length', fs.statSync(imgPath).size);

        let readStream = fs.createReadStream(imgPath);
        readStream.pipe(ctx.res);
      })

      return cb.promise;
    });
  }

}

module.exports = (Media) => new Medias(Media);

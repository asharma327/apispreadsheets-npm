'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// Node 10 compatible client mirroring your Python endpoints
var fetch = require('node-fetch'); // v2
var FormData = require('form-data');
var fs = require('fs');
var path = require('path');

var APIError = function (_Error) {
    _inherits(APIError, _Error);

    function APIError() {
        _classCallCheck(this, APIError);

        return _possibleConstructorReturn(this, (APIError.__proto__ || Object.getPrototypeOf(APIError)).apply(this, arguments));
    }

    return APIError;
}(Error);

var APISpreadsheets = function () {
    function APISpreadsheets() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            accessKey = _ref.accessKey,
            secretKey = _ref.secretKey,
            _ref$baseUrl = _ref.baseUrl,
            baseUrl = _ref$baseUrl === undefined ? "https://api.apispreadsheets.com" : _ref$baseUrl,
            _ref$bearerToken = _ref.bearerToken,
            bearerToken = _ref$bearerToken === undefined ? null : _ref$bearerToken,
            _ref$defaultHeaders = _ref.defaultHeaders,
            defaultHeaders = _ref$defaultHeaders === undefined ? null : _ref$defaultHeaders,
            _ref$timeout = _ref.timeout,
            timeout = _ref$timeout === undefined ? 45 : _ref$timeout;

        _classCallCheck(this, APISpreadsheets);

        this.baseUrl = (baseUrl || 'https://api.apispreadsheets.com').replace(/\/+$/, '');
        this.accessKey = accessKey || null;
        this.secretKey = secretKey || null;
        this.bearerToken = bearerToken || null;
        this.defaultHeaders = defaultHeaders || {};
        this.timeout = typeof timeout === 'number' ? timeout * 1000 : 45000; // ms
    }

    _createClass(APISpreadsheets, [{
        key: '_buildHeaders',
        value: function _buildHeaders(extra) {
            var h = Object.assign({ 'content-type': 'application/json' }, this.defaultHeaders);
            if (this.accessKey != null && !('accessKey' in h)) h.accessKey = this.accessKey;
            if (this.secretKey != null && !('secretKey' in h)) h.secretKey = this.secretKey;
            if (this.bearerToken) h.Authorization = 'Bearer ' + this.bearerToken;
            if (extra) Object.assign(h, extra);
            return h;
        }
    }, {
        key: '_interpolatePath',
        value: function _interpolatePath(pathTmpl, pathParams) {
            if (!pathParams) return pathTmpl;
            var p = pathTmpl;
            Object.keys(pathParams).forEach(function (k) {
                p = p.replace('{' + String(k) + '}', String(pathParams[k]));
            });
            return p;
        }
    }, {
        key: '_buildUrl',
        value: function _buildUrl(pathTmpl, pathParams, query) {
            var pathname = this._interpolatePath(pathTmpl, pathParams || {});
            var url = new URL(this.baseUrl + pathname);
            if (query) {
                Object.keys(query).forEach(function (k) {
                    if (query[k] !== undefined && query[k] !== null) {
                        url.searchParams.append(k, String(query[k]));
                    }
                });
            }
            return url.toString();
        }
    }, {
        key: '_request',
        value: async function _request(method, pathTmpl) {
            var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
                pathParams = _ref2.pathParams,
                query = _ref2.query,
                headers = _ref2.headers,
                body = _ref2.body;

            var url = this._buildUrl(pathTmpl, pathParams, query);
            var h = this._buildHeaders(headers);

            var fetchBody = null;
            var contentType = h['content-type'] || h['Content-Type'];

            if (body !== undefined && body !== null) {
                if (contentType && contentType.indexOf('application/json') >= 0) {
                    fetchBody = JSON.stringify(body);
                } else {
                    // For multipart or custom bodies, pass as-is
                    fetchBody = body;
                }
            }

            var res = await fetch(url, {
                method: method.toUpperCase(),
                headers: h,
                body: fetchBody,
                timeout: this.timeout // supported in node-fetch v2
            });

            var ct = (res.headers.get('content-type') || '').toLowerCase();
            var isJson = ct.indexOf('application/json') >= 0;
            var payload = isJson ? await res.json() : await res.text();

            if (!res.ok) {
                throw new APIError(method.toUpperCase() + ' ' + this._interpolatePath(pathTmpl, pathParams || {}) + ' -> HTTP ' + res.status + ': ' + (isJson ? JSON.stringify(payload) : payload));
            }
            return payload;
        }

        // ---------- Endpoints (mirroring Python) ----------

    }, {
        key: 'runAgent',
        value: async function runAgent(_ref3) {
            var agent_hash = _ref3.agent_hash,
                temperature = _ref3.temperature,
                top_p = _ref3.top_p,
                file_ids = _ref3.file_ids,
                file_descriptions = _ref3.file_descriptions,
                body = _ref3.body,
                accessKey = _ref3.accessKey,
                secretKey = _ref3.secretKey;

            if (!agent_hash) throw new APIError('Missing required path param: agent_hash');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            if (!body) {
                body = {};
                if (temperature != null) body.temperature = temperature;
                if (top_p != null) body.top_p = top_p;
                if (file_ids != null) body.file_ids = file_ids;
                if (file_descriptions != null) body.file_descriptions = file_descriptions;
            }

            return this._request('post', '/agents/{agent_hash}', {
                pathParams: { agent_hash: agent_hash },
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'agentJobStatus',
        value: async function agentJobStatus(_ref4) {
            var job_hash = _ref4.job_hash,
                accessKey = _ref4.accessKey,
                secretKey = _ref4.secretKey,
                _ref4$method = _ref4.method,
                method = _ref4$method === undefined ? 'get' : _ref4$method;

            if (!job_hash) throw new APIError('Missing required path param: job_hash');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak || !sk) throw new APIError('Missing required query params: accessKey and secretKey');

            method = String(method).toLowerCase();
            if (method !== 'get' && method !== 'post') throw new APIError("method must be 'get' or 'post'");

            return this._request(method, '/agents/jobs/{job_hash}', {
                pathParams: { job_hash: job_hash },
                query: { accessKey: ak, secretKey: sk }
            });
        }
    }, {
        key: 'ai',
        value: async function ai(_ref5) {
            var file_id = _ref5.file_id,
                prompt = _ref5.prompt,
                accessKey = _ref5.accessKey,
                secretKey = _ref5.secretKey,
                _ref5$method = _ref5.method,
                method = _ref5$method === undefined ? 'post' : _ref5$method,
                _ref5$body = _ref5.body,
                body = _ref5$body === undefined ? null : _ref5$body;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            method = String(method).toLowerCase();
            if (method !== 'get' && method !== 'post') throw new APIError("method must be 'get' or 'post'");

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            if (!body) {
                if (prompt == null) throw new APIError('Missing required request body or prompt');
                body = { prompt: prompt };
            }

            return this._request(method, '/ai/{file_id}/', {
                pathParams: { file_id: file_id },
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'calculate',
        value: async function calculate(_ref6) {
            var file_id = _ref6.file_id,
                sheet_name = _ref6.sheet_name,
                input_cells = _ref6.input_cells,
                output_cells = _ref6.output_cells,
                save_file_post_call = _ref6.save_file_post_call,
                body = _ref6.body,
                accessKey = _ref6.accessKey,
                secretKey = _ref6.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            if (!body) {
                var payload = { input_cells: {}, output_cells: {} };

                if (input_cells != null) {
                    if ((typeof input_cells === 'undefined' ? 'undefined' : _typeof(input_cells)) !== 'object' || Array.isArray(input_cells)) {
                        throw new APIError('input_cells must be a dict');
                    }
                    var values = Object.keys(input_cells).map(function (k) {
                        return input_cells[k];
                    });
                    var isSingleSheet = values.every(function (v) {
                        var t = typeof v === 'undefined' ? 'undefined' : _typeof(v);
                        return v == null || t === 'string' || t === 'number' || t === 'boolean';
                    });
                    if (isSingleSheet) {
                        if (!sheet_name) throw new APIError('sheet_name is required when using shorthand input_cells');
                        payload.input_cells[sheet_name] = input_cells;
                    } else {
                        payload.input_cells = input_cells;
                    }
                }

                if (output_cells != null) {
                    if (Array.isArray(output_cells)) {
                        if (!sheet_name) throw new APIError('sheet_name is required when using shorthand output_cells list');
                        payload.output_cells[sheet_name] = output_cells;
                    } else if ((typeof output_cells === 'undefined' ? 'undefined' : _typeof(output_cells)) === 'object') {
                        payload.output_cells = output_cells;
                    } else {
                        throw new APIError('output_cells must be a list or a dict');
                    }
                }

                if (save_file_post_call != null) {
                    if (typeof save_file_post_call !== 'boolean') throw new APIError('save_file_post_call must be a boolean');
                    payload.save_file_post_call = save_file_post_call;
                }

                body = payload;
            }

            if ((typeof body === 'undefined' ? 'undefined' : _typeof(body)) !== 'object' || Array.isArray(body)) {
                throw new APIError('body must be a dict');
            }
            if (!('input_cells' in body) || !('output_cells' in body)) {
                throw new APIError('body must include "input_cells" and "output_cells" keys');
            }

            return this._request('post', '/calculate/{file_id}/', {
                pathParams: { file_id: file_id },
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'getCustomApi',
        value: async function getCustomApi(_ref7) {
            var customapi_hash = _ref7.customapi_hash,
                body = _ref7.body,
                accessKey = _ref7.accessKey,
                secretKey = _ref7.secretKey;

            if (!customapi_hash) throw new APIError('Missing required path param: customapi_hash');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak || !sk) throw new APIError('Missing required headers: accessKey and secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            return this._request('post', '/custom/details/{customapi_hash}', {
                pathParams: { customapi_hash: customapi_hash },
                headers: hdrs,
                body: body || {}
            });
        }
    }, {
        key: 'runCustomApi',
        value: async function runCustomApi(_ref8) {
            var customapi_id = _ref8.customapi_id,
                body = _ref8.body,
                headers = _ref8.headers;

            if (!customapi_id) throw new APIError('Missing required path param: customapi_id');

            var hdrs = Object.assign({}, headers || {});
            return this._request('post', '/custom/{customapi_id}', {
                pathParams: { customapi_id: customapi_id },
                headers: hdrs,
                body: body || {}
            });
        }
    }, {
        key: 'readData',
        value: async function readData(_ref9) {
            var file_id = _ref9.file_id,
                query = _ref9.query,
                limit = _ref9.limit,
                count = _ref9.count,
                dataFormat = _ref9.dataFormat,
                accessKey = _ref9.accessKey,
                secretKey = _ref9.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required query param: accessKey');
            if (!sk) throw new APIError('Missing required query param: secretKey');

            var q = {};
            if (query != null) q.query = query;
            if (limit != null) q.limit = limit;
            if (count != null) q.count = String(!!count).toLowerCase();
            if (dataFormat != null) q.dataFormat = dataFormat;
            q.accessKey = ak;
            q.secretKey = sk;

            return this._request('get', '/data/{file_id}/', {
                pathParams: { file_id: file_id },
                query: q
            });
        }
    }, {
        key: 'updateData',
        value: async function updateData(_ref10) {
            var file_id = _ref10.file_id,
                body = _ref10.body,
                accessKey = _ref10.accessKey,
                secretKey = _ref10.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            if (!body || !body.data) throw new APIError('Update body must include "data" and "query" keys.');
            if (!('query' in body) || !body.query) throw new APIError('Update requires a "query" string to match rows.');

            return this._request('post', '/data/{file_id}/', {
                pathParams: { file_id: file_id },
                headers: { accessKey: ak, secretKey: sk },
                body: body
            });
        }
    }, {
        key: 'createData',
        value: async function createData(_ref11) {
            var file_id = _ref11.file_id,
                body = _ref11.body,
                accessKey = _ref11.accessKey,
                secretKey = _ref11.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            if (!body || !('data' in body)) throw new APIError('Request body must include "data" key, e.g. {"data": {...}}');

            return this._request('post', '/data/{file_id}/', {
                pathParams: { file_id: file_id },
                headers: { accessKey: ak, secretKey: sk },
                body: body
            });
        }
    }, {
        key: 'importFiles',
        value: async function importFiles(_ref12) {
            var files = _ref12.files,
                meta = _ref12.meta,
                accesskey = _ref12.accesskey,
                secretkey = _ref12.secretkey;

            if (!files || !files.length) throw new APIError('No files provided. Pass a list of file paths or file-like streams.');

            var ak = accesskey != null ? accesskey : this.accessKey;
            var sk = secretkey != null ? secretkey : this.secretKey;
            if (!ak || !sk) throw new APIError('Missing required headers: accesskey and secretkey');

            var form = new FormData();
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = files[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var item = _step.value;

                    if (typeof item === 'string') {
                        var fh = fs.createReadStream(item);
                        var filename = path.basename(item);
                        form.append('files', fh, filename);
                    } else if (item && item.path) {
                        // allow { path, filename?, contentType? }
                        form.append('files', fs.createReadStream(item.path), item.filename || path.basename(item.path));
                    } else if (item && item instanceof Buffer) {
                        form.append('files', item, 'uploaded');
                    } else if (item && item.read) {
                        // generic readable stream
                        form.append('files', item, item.path ? path.basename(item.path) : 'uploaded');
                    } else if (Array.isArray(item) && (item.length === 2 || item.length === 3)) {
                        // ["files", {custom tuple}] – keep parity with advanced Python usage
                        form.append('files', item[1]);
                    } else {
                        throw new APIError('Unsupported file item; provide a path string or a readable stream/buffer.');
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            if (meta != null) {
                if ((typeof meta === 'undefined' ? 'undefined' : _typeof(meta)) !== 'object' || Array.isArray(meta)) throw new APIError('meta must be a dict if provided');
                form.append('meta', JSON.stringify(meta));
            }

            // lowercase header names are fine
            var headers = Object.assign({}, form.getHeaders(), {
                accesskey: ak,
                secretkey: sk
            });

            var url = this.baseUrl + '/import';
            var res = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: form,
                timeout: this.timeout
            });

            var ct = (res.headers.get('content-type') || '').toLowerCase();
            var isJson = ct.indexOf('application/json') >= 0;
            var payload = isJson ? await res.json() : await res.text();

            if (!res.ok) {
                throw new APIError('POST /import -> HTTP ' + res.status + ': ' + (isJson ? JSON.stringify(payload) : payload));
            }
            return payload;
        }
    }, {
        key: 'macros',
        value: async function macros(_ref13) {
            var file_id = _ref13.file_id,
                _macros = _ref13.macros,
                macro_parameters = _ref13.macro_parameters,
                input_cells = _ref13.input_cells,
                output_cells = _ref13.output_cells,
                save_file_post_call = _ref13.save_file_post_call,
                post_formula_actions = _ref13.post_formula_actions,
                body = _ref13.body,
                accessKey = _ref13.accessKey,
                secretKey = _ref13.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');
            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            if (!body) {
                if (!_macros) throw new APIError('`macros` is required when no raw `body` is provided');
                var payload = { macros: _macros };
                if (Array.isArray(macro_parameters)) payload.macro_parameters = macro_parameters.slice();
                if (input_cells && (typeof input_cells === 'undefined' ? 'undefined' : _typeof(input_cells)) === 'object') payload.input_cells = input_cells;
                if (output_cells && (typeof output_cells === 'undefined' ? 'undefined' : _typeof(output_cells)) === 'object') payload.output_cells = output_cells;
                if (save_file_post_call != null) {
                    if (typeof save_file_post_call !== 'boolean') throw new APIError('save_file_post_call must be a boolean');
                    payload.save_file_post_call = save_file_post_call;
                }
                if (post_formula_actions != null) payload.post_formula_actions = post_formula_actions;
                body = payload;
            }

            return this._request('post', '/macro/{file_id}/', {
                pathParams: { file_id: file_id },
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'createFile',
        value: async function createFile(_ref14) {
            var data = _ref14.data,
                fileName = _ref14.fileName,
                body = _ref14.body,
                accessKey = _ref14.accessKey,
                secretKey = _ref14.secretKey;

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            if (!body) {
                if (data == null) throw new APIError('Missing required body field: data');
                if (!fileName) throw new APIError('Missing required body field: fileName');
                body = { data: data, fileName: fileName };
            }

            return this._request('post', '/utilities/create', {
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'downloadFile',
        value: async function downloadFile(_ref15) {
            var data = _ref15.data,
                fileName = _ref15.fileName,
                body = _ref15.body,
                accessKey = _ref15.accessKey,
                secretKey = _ref15.secretKey;

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var hdrs = { accessKey: ak, secretKey: sk };
            if (!body) {
                if (data == null) throw new APIError('Missing required body field: data');
                if (!fileName) throw new APIError('Missing required body field: fileName');
                body = { data: data, fileName: fileName };
            }

            return this._request('post', '/utilities/download', {
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'listFiles',
        value: async function listFiles(_ref16) {
            var page = _ref16.page,
                pageSize = _ref16.pageSize,
                q = _ref16.q,
                sortBy = _ref16.sortBy,
                sortOrder = _ref16.sortOrder,
                createdAfter = _ref16.createdAfter,
                createdBefore = _ref16.createdBefore,
                accessKey = _ref16.accessKey,
                secretKey = _ref16.secretKey;

            var hdrs = {};
            if (accessKey == null) throw new APIError('Missing required header param: accessKey');
            if (secretKey == null) throw new APIError('Missing required header param: secretKey');
            hdrs.accessKey = accessKey;
            hdrs.secretKey = secretKey;

            var query = {};
            if (page != null) query.page = page;
            if (pageSize != null) query.pageSize = pageSize;
            if (q != null) query.q = q;
            if (sortBy != null) query.sortBy = sortBy;
            if (sortOrder != null) query.sortOrder = sortOrder;
            if (createdAfter != null) query.createdAfter = createdAfter;
            if (createdBefore != null) query.createdBefore = createdBefore;

            return this._request('get', '/utilities/files', {
                headers: hdrs,
                query: query
            });
        }
    }, {
        key: 'getFile',
        value: async function getFile(_ref17) {
            var file_id = _ref17.file_id,
                includeSamples = _ref17.includeSamples,
                sampleRows = _ref17.sampleRows,
                accessKey = _ref17.accessKey,
                secretKey = _ref17.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');
            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var query = {};
            if (includeSamples != null) query.includeSamples = String(!!includeSamples).toLowerCase();
            if (sampleRows != null) query.sampleRows = sampleRows;

            return this._request('get', '/utilities/files/{file_id}', {
                pathParams: { file_id: file_id },
                headers: { accessKey: ak, secretKey: sk },
                query: query
            });
        }
    }, {
        key: 'updateFile',
        value: async function updateFile(_ref18) {
            var file_id = _ref18.file_id,
                name = _ref18.name,
                description = _ref18.description,
                sheetRead = _ref18.sheetRead,
                body = _ref18.body,
                accessKey = _ref18.accessKey,
                secretKey = _ref18.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');
            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            if (!body) {
                body = {};
                if (name != null) body.name = name;
                if (description != null) body.description = description;
                if (sheetRead != null) body.sheetRead = sheetRead;
            }

            return this._request('post', '/utilities/files/{file_id}/', {
                pathParams: { file_id: file_id },
                query: { update: 'true' },
                headers: { accessKey: ak, secretKey: sk },
                body: body || {}
            });
        }
    }, {
        key: 'deleteFile',
        value: async function deleteFile(_ref19) {
            var file_id = _ref19.file_id,
                accessKey = _ref19.accessKey,
                secretKey = _ref19.secretKey;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            return this._request('get', '/utilities/files/{file_id}', {
                pathParams: { file_id: file_id },
                query: { delete: 'true' },
                headers: { accessKey: ak, secretKey: sk }
            });
        }
    }, {
        key: 'runMacros',
        value: async function runMacros(_ref20) {
            var file_id = _ref20.file_id,
                input_cells = _ref20.input_cells,
                output_cells = _ref20.output_cells,
                sheet_name = _ref20.sheet_name,
                save_file_post_call = _ref20.save_file_post_call,
                accessKey = _ref20.accessKey,
                secretKey = _ref20.secretKey,
                body = _ref20.body;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            // This endpoint expects accessKey/secretKey IN THE BODY (per docs screenshot).
            // If `body` not provided, build it from convenience args.
            if (!body) {
                if (!input_cells || (typeof input_cells === 'undefined' ? 'undefined' : _typeof(input_cells)) !== 'object' || Array.isArray(input_cells)) {
                    throw new APIError('input_cells (object) is required in body for runMacros');
                }
                if (save_file_post_call != null && typeof save_file_post_call !== 'boolean') {
                    throw new APIError('save_file_post_call must be a boolean');
                }
                if (!accessKey) throw new APIError('Missing required body param: accessKey');
                if (!secretKey) throw new APIError('Missing required body param: secretKey');

                body = {
                    accessKey: accessKey,
                    secretKey: secretKey,
                    input_cells: input_cells
                };
                if (sheet_name != null) body.sheet_name = sheet_name;
                if (Array.isArray(output_cells)) body.output_cells = output_cells;
                if (save_file_post_call != null) body.save_file_post_call = save_file_post_call;
            } else {
                // minimal validation if raw body supplied
                if (!body.accessKey) throw new APIError('Missing required body param: accessKey');
                if (!body.secretKey) throw new APIError('Missing required body param: secretKey');
                if (!body.input_cells || _typeof(body.input_cells) !== 'object' || Array.isArray(body.input_cells)) {
                    throw new APIError('body.input_cells must be an object');
                }
            }

            // Note: we send keys in BODY per docs. If your client was constructed with default keys,
            // they may also appear in headers (harmless). To avoid that, construct Client without defaults.
            return this._request('post', '/run-macros/{file_id}/', {
                pathParams: { file_id: file_id },
                headers: {}, // rely on JSON content-type from _build_headers
                body: body
            });
        }
        // Get OpenAPI spec for a file/test endpoint

    }, {
        key: 'getApiSpec',
        value: async function getApiSpec() {
            var _ref21 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                file_id = _ref21.file_id,
                _ref21$is_test = _ref21.is_test,
                is_test = _ref21$is_test === undefined ? false : _ref21$is_test,
                accessKey = _ref21.accessKey,
                secretKey = _ref21.secretKey,
                headers = _ref21.headers;

            if (!file_id) throw new APIError('Missing required path param: file_id');

            // prefer per-call keys, else client defaults
            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;

            // If you intend to bypass auth (only for testing), pass is_test: true.
            if (!is_test) {
                if (!ak) throw new APIError('Missing required header param: accessKey');
                if (!sk) throw new APIError('Missing required header param: secretKey');
            }

            var hdrs = Object.assign({}, headers || {}, ak ? { accessKey: ak } : {}, sk ? { secretKey: sk } : {});

            var body = { is_test: !!is_test };

            return this._request('post', '/spec/{file_id}', {
                pathParams: { file_id: file_id },
                headers: hdrs,
                body: body
            });
        }
    }, {
        key: 'buildAgent',
        value: async function buildAgent() {
            var _ref22 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                accessKey = _ref22.accessKey,
                secretKey = _ref22.secretKey,
                agentName = _ref22.agentName,
                agentDescription = _ref22.agentDescription,
                selectedFiles = _ref22.selectedFiles,
                fileDescriptions = _ref22.fileDescriptions,
                selectedOutputFormats = _ref22.selectedOutputFormats,
                agentInstructions = _ref22.agentInstructions,
                body = _ref22.body;

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            var allowed = ['.xlsx', '.pdf', '.html', '.docx', '.csv'];

            if (!body) {
                if (!agentName || !String(agentName).trim()) {
                    throw new APIError('agentName is required');
                }
                if (!Array.isArray(selectedFiles) || selectedFiles.length === 0) {
                    throw new APIError('selectedFiles must be a non-empty array of file ids');
                }
                if (selectedOutputFormats != null) {
                    if (!Array.isArray(selectedOutputFormats)) {
                        throw new APIError('selectedOutputFormats must be an array');
                    }
                    var bad = selectedOutputFormats.filter(function (f) {
                        return allowed.indexOf(f) === -1;
                    });
                    if (bad.length) throw new APIError('Invalid output format(s): ' + bad.join(', '));
                }

                body = {
                    agentName: agentName,
                    agentDescription: agentDescription || '',
                    selectedFiles: selectedFiles,
                    fileDescriptions: fileDescriptions || {},
                    selectedOutputFormats: selectedOutputFormats || [],
                    agentInstructions: agentInstructions || ''
                };
            } else {
                // minimal shape checks if raw body supplied
                if (!body.agentName) throw new APIError('agentName is required');
                if (!Array.isArray(body.selectedFiles) || !body.selectedFiles.length) {
                    throw new APIError('selectedFiles must be a non-empty array of file ids');
                }
                if (Array.isArray(body.selectedOutputFormats)) {
                    var _bad = body.selectedOutputFormats.filter(function (f) {
                        return allowed.indexOf(f) === -1;
                    });
                    if (_bad.length) throw new APIError('Invalid output format(s): ' + _bad.join(', '));
                }
            }

            return this._request('post', '/build-agent/', {
                headers: { accessKey: ak, secretKey: sk },
                body: body
            });
        }
    }, {
        key: 'deleteCustomApi',
        value: async function deleteCustomApi() {
            var _ref23 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                customapi_hash = _ref23.customapi_hash,
                accessKey = _ref23.accessKey,
                secretKey = _ref23.secretKey,
                body = _ref23.body;

            if (!customapi_hash) throw new APIError('Missing required path param: customapi_hash');

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            return this._request('post', '/custom/delete/{customapi_hash}', {
                pathParams: { customapi_hash: customapi_hash },
                headers: { accessKey: ak, secretKey: sk },
                body: body || {}
            });
        }
    }, {
        key: 'getCustomApis',
        value: async function getCustomApis() {
            var _ref24 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
                accessKey = _ref24.accessKey,
                secretKey = _ref24.secretKey,
                body = _ref24.body;

            var ak = accessKey != null ? accessKey : this.accessKey;
            var sk = secretKey != null ? secretKey : this.secretKey;
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');

            return this._request('post', '/custom/list', {
                headers: { accessKey: ak, secretKey: sk },
                body: body || {}
            });
        }
    }]);

    return APISpreadsheets;
}();

module.exports = { APISpreadsheets: APISpreadsheets, APIError: APIError };
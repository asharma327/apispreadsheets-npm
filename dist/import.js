"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var APISpreadsheetsImporter = function () {
    function APISpreadsheetsImporter(key, callback) {
        var matchCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var editCallback = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

        _classCallCheck(this, APISpreadsheetsImporter);

        this.key = key;
        this.callback = callback;
        this.editCallback = editCallback;
        this.matchCallback = matchCallback;
        this.modalOpen = false;

        this.addCSS();
    }

    _createClass(APISpreadsheetsImporter, [{
        key: "importFiles",
        value: function importFiles() {
            if (!this.modalOpen) {
                this.initImporter();
                this.openModal("apiSpreadsheetsImportModal");
            }
        }
    }, {
        key: "initImporter",
        value: function initImporter() {
            this.listenToIframeMessages();
            var iFrameElem = this.createIFrame("");

            this.attachModalToDOM(iFrameElem, "apiSpreadsheetsImportModal");
        }
    }, {
        key: "listenToIframeMessages",
        value: function listenToIframeMessages() {
            var _this = this;

            window.addEventListener("message", function (e) {
                try {
                    if ("success" in e.data && "fileInfo" in e.data && !("editFileID" in e.data)) {
                        _this.callback(e.data.success, e.data.fileInfo);
                    }

                    if ("success" in e.data && "fileInfo" in e.data && "editFileID" in e.data) {
                        if (_this.editCallback !== null) {
                            _this.editCallback(e.data.success, e.data.fileInfo, e.data.editFileID);
                        }
                    }

                    if ("match" in e.data) {
                        if (_this.matchCallback !== null) {
                            _this.matchCallback(e.data.match.required, e.data.match.completed);
                        }
                    }
                } catch (e) {}
            }, false);
        }
    }, {
        key: "createIFrame",
        value: function createIFrame(iframeType) {
            var iFrameElem = document.createElement("iframe");
            var baseURL = this.getIFrameURL(iframeType);

            iFrameElem.setAttribute("src", baseURL);
            iFrameElem.frameBorder = '0';
            iFrameElem.classList.add("apiSpreadsheetsIframe");

            return iFrameElem;
        }
    }, {
        key: "attachModalToDOM",
        value: function attachModalToDOM(iFrameElem, id) {
            var modalElement = this.createModalElement(iFrameElem, id);

            document.body.appendChild(modalElement);
        }
    }, {
        key: "addCSS",
        value: function addCSS() {
            var styleElm = document.createElement("style");
            styleElm.type = "text/css";

            styleElm.innerText = "\
			.closeAPISpreadsheetsIcon{\
  				position: absolute;\
  				right: 32px;\
  				top: 32px;\
  				width: 32px;\
  				height: 32px;\
  				opacity: 0.3;\
  				cursor: pointer;\
			}\
			\
			.closeAPISpreadsheetsIcon:hover {\
  				opacity: 1;\
			}\
			\
			.closeAPISpreadsheetsIcon:before, .closeAPISpreadsheetsIcon:after {\
  				position: absolute;\
  				left: 15px;\
  				content: ' ';\
  				height: 33px;\
  				width: 2px;\
  				background-color: #333;\
			}\
			\
			.closeAPISpreadsheetsIcon:before {\
  				transform: rotate(45deg);\
			}\
			\
			.closeAPISpreadsheetsIcon:after {\
  				transform: rotate(-45deg);\
			}\
			\
			.apiSpreadsheetsIframe{\
				width: 100%;\
				min-height: 100vh;\
				padding-top: 50px;\
			}\
			.api-spreadsheets-import-button{\
			    background-color: green;\
			    color: white;\
			    padding: 10px 25px 10px 25px;\
			    border: none;\
			    font-size: 18px;\
			    cursor: pointer;\
			}\
			\
			.api-spreadsheets-import-button:hover{\
			    box-shadow: 0 0 20px rgba(33,33,33,.2);\
			    background-color:  #52be80;\
			}\
		";

            var head = document.head || document.getElementsByTagName('head')[0];
            head.appendChild(styleElm);
        }
    }, {
        key: "createModalElement",
        value: function createModalElement(iFrameElem, id) {
            var modalOuterStyle = "display:none;position:fixed;z-index:2147483647;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgba(0,0,0,0.4);";
            var modalInnerStyle = "position:relative;background-color:#fefefe;top:8%;margin:auto;padding:0;border-radius:10px;width:80%;box-shadow:0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);animation-name:animatetop;animation-duration:0.4s;margin-bottom:50px;opacity:1;";
            var modalBodyStyle = "padding:15px 16px;";

            var modalElement = document.createElement("div");
            modalElement.style.cssText = modalOuterStyle;

            var modalInnerElement = document.createElement("div");
            modalInnerElement.style.cssText = modalInnerStyle;

            var modalBodyElement = document.createElement("div");
            modalBodyElement.style.cssText = modalBodyStyle;

            var headerElement = this.getHeaderElement();

            modalBodyElement.appendChild(headerElement);
            modalBodyElement.appendChild(iFrameElem);

            modalInnerElement.appendChild(modalBodyElement);
            modalElement.appendChild(modalInnerElement);

            modalElement.setAttribute('id', id);

            return modalElement;
        }
    }, {
        key: "getHeaderElement",
        value: function getHeaderElement() {
            var closeElement = this.getCloseElement();

            var headerElement = document.createElement("div");
            // const headerText = document.createElement("h2");
            // headerText.innerHTML = "Upload your files"
            // headerElement.appendChild(headerText)
            headerElement.appendChild(closeElement);

            return headerElement;
        }
    }, {
        key: "getCloseElement",
        value: function getCloseElement() {
            var closeElm = document.createElement("div");
            closeElm.classList.add("closeAPISpreadsheetsIcon");
            // closeElm.onclick = function () {
            //     const modal = document.getElementById("apiSpreadsheetsImportModal");
            //     modal.style.display = 'none';
            // }
            closeElm.onclick = this.closeImporter;
            return closeElm;
        }
    }, {
        key: "openModal",
        value: function openModal(id) {
            if (!this.modalOpen) {
                var modal = document.getElementById(id);
                modal.style.display = 'block';
            }
        }
    }, {
        key: "closeImporter",
        value: function closeImporter() {
            try {
                var modal = document.getElementById("apiSpreadsheetsImportModal");
                modal.style.display = 'none';
            } catch (e) {}

            try {
                var modal2 = document.getElementById("apiSpreadsheetsEditModal");
                modal2.style.display = 'none';
                modal2.parentElement.removeChild(modal2);
            } catch (e) {}
        }
    }, {
        key: "editFile",
        value: function editFile(fileID) {
            this.initEditFile(fileID);
            this.openModal("apiSpreadsheetsEditModal");
        }
    }, {
        key: "initEditFile",
        value: function initEditFile(fileID) {
            this.listenToIframeMessages();
            var iFrameElem = this.createIFrame("/edit/" + fileID);

            this.attachModalToDOM(iFrameElem, "apiSpreadsheetsEditModal");
        }
    }, {
        key: "getIFrameURL",
        value: function getIFrameURL(endURL) {
            var baseURL = "https://www.apispreadsheets.com/";
            // let baseURL = "http://localhost:5000/"

            baseURL += "import/embed/" + this.key + endURL;

            return baseURL;
        }
    }, {
        key: "insertImporter",
        value: function insertImporter() {
            this.listenToIframeMessages();

            return this.getIFrameURL("");
        }
    }]);

    return APISpreadsheetsImporter;
}();

exports.default = APISpreadsheetsImporter;
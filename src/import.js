class APISpreadsheetsImporter {
    constructor(key,callback,matchCallback=null){
        this.key = key;
        this.callback = callback;
        this.matchCallback = matchCallback;
        this.modalOpen = false;

        this.addCSS()
    }

    importFiles(){
        if (!this.modalOpen){
            this.initImporter()
            this.openModal()
        }
    }

    initImporter(){
        this.listenToIframeMessages()
        const iFrameElem = this.createIFrame()

        this.attachModalToDOM(iFrameElem)
    }

    listenToIframeMessages(){
        window.addEventListener("message", (e) => {
            try{
                if ("success" in e.data && "fileInfo" in e.data){
                    this.callback(e.data.success, e.data.fileInfo)
                }

                if ("match" in e.data){
                    if (this.matchCallback !== null){
                        this.matchCallback(e.data.match.required, e.data.match.completed)
                    }
                }
            } catch(e){

            }

        }, false)
    }

    createIFrame(){
        const iFrameElem = document.createElement("iframe");
        // iFrameElem.setAttribute("src", "http://localhost:5000/import/embed/" + this.key)
        // const baseURL = window.location.href.includes("apispreadsheets.com") ? "https://www.apispreadsheets.com/" : "http://localhost:5000/"
        const baseURL = "https://www.apispreadsheets.com/"
        // const baseURL = "http://localhost:5000/"
        // console.log(window.location.href)
        // console.log(baseURL + "import/embed/" + this.key)
        iFrameElem.setAttribute("src", baseURL + "import/embed/" + this.key)
        iFrameElem.frameBorder = '0';
        iFrameElem.classList.add("apiSpreadsheetsIframe");

        return iFrameElem
    }

    attachModalToDOM(iFrameElem){
        const modalElement = this.createModalElement(iFrameElem)

        document.body.appendChild(modalElement);
    }

    addCSS(){
        const styleElm = document.createElement("style");
        styleElm.type="text/css";

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
		"

        const head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(styleElm)

    }

    createModalElement(iFrameElem){
        const modalOuterStyle = "display:none;position:fixed;z-index:2147483647;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgba(0,0,0,0.4);";
        const modalInnerStyle = "position:relative;background-color:#fefefe;top:8%;margin:auto;padding:0;border-radius:10px;width:80%;box-shadow:0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);animation-name:animatetop;animation-duration:0.4s;margin-bottom:50px;opacity:1;"
        const modalBodyStyle = "padding:15px 16px;"

        let modalElement = document.createElement("div");
        modalElement.style.cssText = modalOuterStyle;

        let modalInnerElement = document.createElement("div");
        modalInnerElement.style.cssText = modalInnerStyle;

        let modalBodyElement = document.createElement("div");
        modalBodyElement.style.cssText = modalBodyStyle;

        let headerElement = this.getHeaderElement();

        modalBodyElement.appendChild(headerElement)
        modalBodyElement.appendChild(iFrameElem)

        modalInnerElement.appendChild(modalBodyElement)
        modalElement.appendChild(modalInnerElement)

        modalElement.setAttribute('id', 'apiSpreadsheetsImportModal')

        return modalElement
    }

    getHeaderElement(){
        const closeElement = this.getCloseElement()

        const headerElement = document.createElement("div");
        // const headerText = document.createElement("h2");
        // headerText.innerHTML = "Upload your files"
        // headerElement.appendChild(headerText)
        headerElement.appendChild(closeElement)

        return headerElement
    }

    getCloseElement(){
        const closeElm = document.createElement("div")
        closeElm.classList.add("closeAPISpreadsheetsIcon")
        // closeElm.onclick = function () {
        //     const modal = document.getElementById("apiSpreadsheetsImportModal");
        //     modal.style.display = 'none';
        // }
        closeElm.onclick = this.closeImporter
        return closeElm
    }

    openModal(){
        if (!this.modalOpen){
            const modal = document.getElementById("apiSpreadsheetsImportModal");
            modal.style.display = 'block';
        }
    }

    closeImporter(){
        const modal = document.getElementById("apiSpreadsheetsImportModal");
        modal.style.display = 'none';
    }

}

export default APISpreadsheetsImporter
'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fs = require('fs');
import path = require('path');

enum DocumentType {
	none = 0,
	watch = 1,
	target = 2
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let controller = new EduwillController();
	
	vscode.commands.registerCommand('sampleextension.compare', controller.CompareFiles, controller);
	
	vscode.workspace.onDidOpenTextDocument((textDocument: vscode.TextDocument) => {
		controller.InitEduwill(textDocument);
	})
	vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {	
		controller.ProcessEduwill(textDocument);
	});
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class EduwillController{
	private TARGETFOLDERPATH = <string>vscode.workspace.getConfiguration('sampleextension').get('targetfolderpath');	//"Y:\\www_eduwill_real"
	private WATCHFOLDERPATH = <string>vscode.workspace.getConfiguration('sampleextension').get('watchfolderpath');		//"Z:\\Eduwill_Src"
	
	public mkdirp = require('mkdirp');
	
	public InitEduwill(textDocument: vscode.TextDocument){		
		if (vscode.workspace.rootPath === null) return;
		if (this.getDocumentType(textDocument) != DocumentType.watch) return;
		vscode.window.showInformationMessage("Watching..");
	}

	public ProcessEduwill(textDocument: vscode.TextDocument){
		if (vscode.workspace.rootPath === null) return;
		if (this.getDocumentType(textDocument) != DocumentType.watch) return;
		let fileName = path.basename(textDocument.fileName);
		let filePath = vscode.workspace.asRelativePath(textDocument.fileName).replace(new RegExp( this.WATCHFOLDERPATH.replace("\\", "\\\\"), "gi"), "").replace(new RegExp(fileName, "gi"), "");
		let IsFileExists = false;
		let IsFolderExists = false;
		let ReturnMessage = '';
		
		//수정한 파일의 경로와 동일한 파일이 www_eduwill_real경로에 이 존재하는지 여부를 확인
		if (fs.existsSync(this.TARGETFOLDERPATH + filePath)) IsFolderExists = true;
		if (fs.existsSync(this.TARGETFOLDERPATH + filePath + fileName)) IsFileExists = true;
				
		//1.1 폴더와 파일이 존재하는 경우 파일 수정 명령어 생성
		if (IsFileExists){
			ReturnMessage = '/root/bin/eduwill_deploy.sh www_eduwill_real' + filePath.replace(/\\/g, '/') + fileName; 
			vscode.window.showInformationMessage(ReturnMessage, 'Compare', 'Just File Copy', 'Give me Copy Path').then(target => {
				switch (target) {
					case 'Compare':
						this.openCompareView(this.WATCHFOLDERPATH + filePath + fileName, this.TARGETFOLDERPATH + filePath + fileName);
						break;
					case 'Just File Copy':
						vscode.window.showInformationMessage("Are you sure? This gonna overwrite the file...", 'Go coward!', 'Nevermind').then(target => {
							if (target != 'Nevermind') this.copyFile(textDocument.fileName, this.TARGETFOLDERPATH + filePath + fileName);
						})
						break;
					case 'Give me Copy Path':
						ReturnMessage = '/root/bin/eduwill_deploy_www_eduwill_real.sh real ' + filePath.replace(/\\/g, '/');
						vscode.window.showInformationMessage(ReturnMessage);
						break;
					default:
						break;
				}
			});
		}
		
		//1.2 존재하지 않는 경우 파일 추가 명령어 생성
		else{
			if (IsFolderExists) ReturnMessage = '/root/bin/eduwill_deploy.sh www_eduwill_real' + filePath.replace(/\\/g, '/') + fileName; 
			else ReturnMessage = '/root/bin/eduwill_deploy_www_eduwill_real.sh real ' + filePath.replace(/\\/g, '/');

			vscode.window.showInformationMessage(ReturnMessage, 'Copy File').then(target => {
				if (target != 'Copy File') return;
				if (!IsFolderExists) 
					this.mkdirp(this.TARGETFOLDERPATH + filePath, function(err){
						vscode.window.showErrorMessage(err);
					});
				if (!IsFileExists) this.copyFile(textDocument.fileName, this.TARGETFOLDERPATH + filePath + fileName);
			})
		}
	}
	
	private getDocumentType(textDocument: vscode.TextDocument){
		let retval = DocumentType.none;
				
		let fullFilePath = vscode.workspace.asRelativePath(textDocument.fileName).replace("\\\\", "\\");
		let opt = fullFilePath.search(new RegExp(this.WATCHFOLDERPATH.replace("\\", "\\\\"), "gi"));
		if (opt >= 0) retval = DocumentType.watch;

		opt = fullFilePath.search(new RegExp(this.TARGETFOLDERPATH.replace("\\", "\\\\"), "gi"));
		if (opt >= 0) retval = DocumentType.target;
		
		return retval;
	}
		
	private internalOpen(filePath) {
        if (filePath)
            return new Promise((resolve, reject) => {
                vscode.workspace.openTextDocument(filePath).then(d => {
                        vscode.window.showTextDocument(d) .then(()=>resolve(), (err)=>reject(err))
				}, (err)=>reject(err));
            });
    }
	
	private openCompareView(source, target){
		this.internalOpen(source)
			.then(() => {
				vscode.commands.executeCommand("workbench.files.action.compareFileWith");
				this.internalOpen(target);
			})
	}
	
	private copyFile(source, target) {
		return new Promise(function(resolve, reject) {
			var rd = fs.createReadStream(source);
			rd.on('error', reject);
			var wr = fs.createWriteStream(target);
			wr.on('error', reject);
			wr.on('finish', resolve);
			rd.pipe(wr);
    	});
	}
	
	public CompareFiles(){
		if (vscode.workspace.rootPath === null) return;
		
		let textDocument = (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document);
		
		if (this.getDocumentType(textDocument) != DocumentType.watch) return;
		let fileName = path.basename(textDocument.fileName);
		let filePath = vscode.workspace.asRelativePath(textDocument.fileName).replace(new RegExp( this.WATCHFOLDERPATH.replace("\\", "\\\\"), "gi"), "").replace(new RegExp(fileName, "gi"), "");
		
		this.openCompareView(this.WATCHFOLDERPATH + filePath + fileName, this.TARGETFOLDERPATH + filePath + fileName);
	}	
}


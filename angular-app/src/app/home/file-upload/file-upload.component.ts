import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FlaskRequests } from '../../services/server.service'; 
import { Router } from '@angular/router';
import LZString from 'lz-string';


interface FileItem {
  objectURL: string;
  name: string;
  size: string; // Size as string to handle display
  isImage: boolean;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',

})
export class FileUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  files: FileItem[] = [];
  actualFiles: File[] = [];
  allowedFileTypes: string[] = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/json',  'application/geo+json']; 
  isDraggedOver = false;
  initialJsonData: any;
  userFile: any;
  fatalErrorArray: string[] = ['Uploaded a file in the wrong format. Please upload different format', 'Failed to read file.'];
  isLoading = false;


  constructor(private apiHandler: FlaskRequests,  private router: Router,){}

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      const fileArray = Array.from(event.dataTransfer.files);
      fileArray.forEach(file => this.addFile(file));
    }
    this.isDraggedOver = false;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDraggedOver = true;
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    if (this.hasFiles(event)) {
      this.isDraggedOver = true;
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDraggedOver = false;
  }

  hasFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') || false;
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const fileArray = Array.from(input.files);
      fileArray.forEach(file => this.addFile(file));
    }
  }

  onButtonClick() {
    this.fileInput.nativeElement.click();
  }

  addFile(file: File) {
    if(this.isValidFile(file)){
    const isImage = file.type.startsWith('image/');
    const objectURL = URL.createObjectURL(file);
    this.files.push({
      objectURL,
      name: file.name,
      size: this.formatFileSize(file.size),
      isImage
    });
    this.actualFiles.push(file); // Store actual File object
  }else{
    alert(file.name + ' is not a valid file');
  }
  }

  isValidFile(file: File):boolean {
     const isValidType = this.allowedFileTypes.includes(file.type);
     const isGeoJsonFileName = file.name.toLowerCase().includes('.geojson');

// Combine both checks
    const isValid = isValidType || isGeoJsonFileName;

    
     return isValid
  }

  formatFileSize(size: number): string {
    return size > 1024
      ? size > 1048576
        ? `${Math.round(size / 1048576)} MB`
        : `${Math.round(size / 1024)} KB`
      : `${size} B`;
  }

  onDelete(file: FileItem) {
    this.files = this.files.filter(f => f.objectURL !== file.objectURL);
    URL.revokeObjectURL(file.objectURL);
    if (this.files.length === 0) {
      // To show 'No files selected' message again
      this.files = [];
    }
  }

  onSubmit() {
    alert(`Submitted Files:\n${JSON.stringify(this.files.map(file => file.name))}`);
    console.log(this.files);
  }

  onCancel() {
    this.files.forEach(file => URL.revokeObjectURL(file.objectURL));
    this.files = [];
  }



  uploadInitialFileToServer() {
    const fileData = new FormData();
    this.isLoading = true;
    

    this.actualFiles.forEach(file => {
      fileData.append('userFiles[]', file, file.name); // Append actual File object
    });


    this.apiHandler.sendInitialData(fileData).subscribe(
      (response) => {
        console.log("made it bruh")
        console.log(response.message); // Handle successful response
        this.initialJsonData = response.user_data;
        sessionStorage.setItem('FIRSTTABLEDATA', LZString.compress(this.initialJsonData));
        this.router.navigate(['/first-table']);
        
      },
      (errorResponse) => {
        console.log(errorResponse.error.message); // Handle error response

        if (!this.fatalErrorArray.includes(errorResponse.error.message) && errorResponse.error.message !== undefined) {
          this.initialJsonData = errorResponse.error.user_data;
          sessionStorage.setItem('FIRSTTABLEDATA', LZString.compress(this.initialJsonData));
          setTimeout(()=>{  console.log(this.initialJsonData);
            this.router.navigate(['/first-table'])},500);
        } else {
          alert(errorResponse.error.message);
        }
        this.isLoading = false
      }
      
    )

  }



}

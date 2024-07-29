import { Component} from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { ReactiveFormsModule } from '@angular/forms';
import { FlaskRequests } from '../service'; 
import { FileExportService } from '../file-export.service';
import { MapboxMapComponent } from '../mapbox-map/mapbox-map.component';
import { FirstTableComponent } from '../first-table/first-table.component';
import { CblTableComponent } from '../cbl-table/cbl-table.component';
import { Router } from '@angular/router';


@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'], 
  imports: [ReactiveFormsModule, CommonModule, MapboxMapComponent, FirstTableComponent, CblTableComponent] 
})


export class HomeComponent{
   userFile: any;
   jsonData: any;
   initialJsonData: any;
   buildingArray: any[] = [];
   fatalErrorArray: string[] = ["Uploaded a file in the wrong format. Please upload different format", "Failed to read file."]


    constructor(private apiHandler: FlaskRequests, private fileExportHandler: FileExportService, private router: Router) {
    }

    ngOnInit(): void {
      this.jsonData = sessionStorage.getItem("GEOJSONDATA");
      console.log(this.jsonData);
      if (this.jsonData){
        this.buildingArray = JSON.parse(this.jsonData).features;
      }
    }


    getUploadFileFromUser(event: any){
      this.userFile = event.target.files[0];
    }
     

    uploadInitialFileToServer() {
      let fileData = new FormData();
      fileData.append("userFile", this.userFile); 
      console.log("File data prepared:", this.userFile);
      this.apiHandler.sendInitialData(fileData).subscribe(
        (response) => {
          console.log(response.message); // Handle successful response
          this.initialJsonData = response.user_data
          sessionStorage.setItem('FIRSTTABLEDATA', this.initialJsonData);
          if (this.userFile) {
            this.router.navigate(['/first-table']);
          }
      },
      (errorResponse) => {
          console.log(errorResponse.error.message); // Handle error response
          
          if (this.userFile && !this.fatalErrorArray.includes(errorResponse.error.message)){
            this.initialJsonData = errorResponse.error.user_data;
            sessionStorage.setItem('FIRSTTABLEDATA', this.initialJsonData);
            console.log(this.initialJsonData);
            this.router.navigate(['/first-table']);
          }
      });
    
    }

    uploadFileToServer() {
      let fileData = new FormData();
      fileData.append("userFile", this.userFile); 
      console.log("File data prepared:", this.userFile);
      this.apiHandler.sendData(fileData).subscribe(
        (response) => {
          console.log(response.message); // Handle successful response
          this.jsonData = response.user_data
          this.buildingArray = JSON.parse(this.jsonData).features;
          sessionStorage.setItem('GEOJSONDATA', this.jsonData);
      },
      (errorResponse) => {
          console.error(errorResponse.error.message); // Handle error response
      });
    }

    exportJSON(): void {
      this.fileExportHandler.downloadJSON(this.jsonData, 'data.json');
    }

 

 
}
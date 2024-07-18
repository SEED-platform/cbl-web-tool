import { Component} from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { ReactiveFormsModule } from '@angular/forms';
import { FlaskRequests } from './service'; 
import { FileExportService } from '../file-export.service';
import { MapboxMapComponent } from '../mapbox-map/mapbox-map.component';


@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'], 
  imports: [ReactiveFormsModule, CommonModule, MapboxMapComponent] 
})


export class HomeComponent{
   userFile: any;
   jsonData: any;
   buildingArray: any[] = [];
   isTable: boolean = true;
   toggleString: string = "Map";


    constructor(private apiHandler: FlaskRequests, private fileExportHandler: FileExportService) {
    }

    ngOnInit(): void {
      this.jsonData = sessionStorage.getItem("GEOJSONDATA");
      if (this.jsonData){
        this.buildingArray = JSON.parse(this.jsonData).features;
      }
    }


    getUploadFileFromUser(event: any){
      this.userFile = event.target.files[0];
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

    tableMapToggle():void{
      if (this.isTable){
          this.isTable = false
          this.toggleString = "Table";
      }else{
        this.isTable = true;
          this.toggleString = "Map";
      }
    }
}
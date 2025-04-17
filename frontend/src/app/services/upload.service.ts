import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
    private uploadUrl = 'http://localhost:8000/api/upload/'; 

  constructor(private http: HttpClient) {}

  uploadFiles(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file, file.name);  // Append each file to FormData
    });

    // Get the access token from localStorage
    const token = localStorage.getItem('access_token');

    // Create headers including the Authorization token if it exists
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : new HttpHeaders();

    // POST request to upload files
    return this.http.post(this.uploadUrl, formData, {
      headers: headers,
      reportProgress: true,
      observe: 'events',
    });
  }

  uploadFolders(formData: FormData): Observable<any> {
    // Get the access token from localStorage
    const token = localStorage.getItem('access_token');

    // Create headers including the Authorization token if it exists
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : new HttpHeaders();

    // POST request to upload folders with authorization header
    return this.http.post(this.uploadUrl, formData, {
      headers: headers,
      reportProgress: true,
      observe: 'events',
    });
  }
}

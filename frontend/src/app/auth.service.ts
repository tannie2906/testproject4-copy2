import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, switchMap, map  } from 'rxjs/operators';  // Add this import
//import { SettingsService } from './services/settings.service';

import { environment } from 'src/environments/environment';
import { jwtDecode } from 'jwt-decode';


import axios from 'axios';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://127.0.0.1:8000/api'; 
  private isLoggedIn = false;
  private registerUrl = 'https://127.0.0.1:8000/api/register/';
  private tokenKey = 'auth_token';
  private profileSubject = new BehaviorSubject<any>(null);
  public profile$ = this.profileSubject.asObservable();
  private token: string | null = null; 
  private twoFactorVerified: boolean = false;
  private authState = new BehaviorSubject<boolean>(this.isAuthenticated());
  authState$ = this.authState.asObservable(); // Expose as observable
  
  constructor(private http: HttpClient) {}

  private getCSRFToken(): string | null {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    return csrfToken || null;
  }

  
  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/token-auth/`, { username, password }).pipe(
      tap((response: any) => {
        if (response && response.access) {
          this.isLoggedIn = true;
          this.token = response.access;
          localStorage.setItem('access_token', response.access);  // ✅ Store JWT access token
          localStorage.setItem('refresh_token', response.refresh); // ✅ Store refresh token
          this.authState.next(true);
        }
      })
    );
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('access_token') !== null;  // ✅ Uses correct token key
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');  // ✅ Uses correct JWT key
  }

  // AuthService
  isTokenExpired(token: string): boolean {
    const decodedToken = this.decodeToken(token);
    if (decodedToken && decodedToken.exp) {
      return decodedToken.exp * 1000 < Date.now();
    }
    return true;
  }

  // Decode JWT to extract claims
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

   // Refresh the access token using the refresh token
   refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return of(null)

    return this.http.post<any>(`${this.apiUrl}/refresh-token/`, { refresh_token: refreshToken }).pipe(
      tap(response => {
        if (response && response.access) {
          localStorage.setItem('access_token', response.access);
        }
      }),
      catchError(error => {
        console.error('Error refreshing token:', error);
        return of(null); // Return null if refresh fails
      })
    );
  }

  // Method to automatically refresh the token if expired
  refreshIfNeeded(): Observable<string | null> {
    const token = this.getToken();
  
    if (token && !this.isTokenExpired(token)) {
      return of(token);  // Token is still valid
    }
  
    return this.refreshToken().pipe(
      map(response => {
        if (response && response.access) {
          localStorage.setItem('access_token', response.access);
          return response.access;  // Return the new access token
        }
        return null;
      })
    );
  }
  
  // Check 2FA verification status
  is2FAVerified(): boolean {
    return this.twoFactorVerified;
  }

  // Update 2FA verification status
  set2FAVerified(status: boolean): void {
    this.twoFactorVerified = status;
  }

  setup2FA(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,  // ✅ Use JWT Bearer token
      'X-CSRFToken': this.getCSRFToken() || '',
    });

    return this.http.post(`${this.apiUrl}/setup-2fa/`, {}, { headers });
  }

  verifyOtp(otpCode: string): Observable<any> {
    const token = this.getToken();
    if (!token) {
      console.error('Token not found!');
      return throwError('Token is required');
    }
  
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,  // ✅ Use JWT Bearer token
      'Content-Type': 'application/json',
    });
  
    console.log('Sending OTP payload:', { otp: otpCode });
  
    return this.http.post(`${this.apiUrl}/verify-2fa/`, { otp: otpCode }, { headers }).pipe(
      tap((response: any) => console.log('Verification successful:', response)),
      catchError((error) => {
        console.error('Verification failed:', error);
        return throwError(error);
      })
    );
  }
 
  logout(): void {
    localStorage.removeItem('access_token');  // ✅ Remove access token
    localStorage.removeItem('refresh_token');  // ✅ Remove refresh token
    this.isLoggedIn = false;
    this.authState.next(false);
  }

  // Fetch user profile
  getProfile(): Observable<any> {
    const token = this.getToken();
    if (!token) return throwError('No token found');
  
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,  // ✅ Use JWT Bearer token
    });
  
    return this.http.get(`${this.apiUrl}/profile/`, { headers }).pipe(
      tap((profileData: any) => {
        this.profileSubject.next(profileData);
      })
    );
  }

  // Update profile picture and broadcast the update
  updateProfilePicture(newPictureUrl: string): void {
    const updatedProfile = { ...this.profileSubject.value, picture: newPictureUrl };
    this.profileSubject.next(updatedProfile);  // Broadcast profile picture update
  }

  updateProfile(token: string, data: any): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put<any>(`${this.apiUrl}/profile/`, data, { headers }).pipe(
      tap(updatedProfile => this.profileSubject.next(updatedProfile))  // Broadcast the updated profile
    );
  }

  getSettings(token: string): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any>(`${this.apiUrl}/settings/`, { headers });
  }

  updateSettings(token: string, data: any): Observable<any> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put<any>(`${this.apiUrl}/settings/`, data, { headers });
  }

  register(userData: any) {
    return this.http.post(this.registerUrl, userData);
  }

  initializeCSRF(): Observable<any> {
    return this.http.get('https://127.0.0.1:8000/api/password-reset-request', { withCredentials: true });
 }

  // Request password reset
  requestPasswordReset(email: string): Observable<any> {
    const csrfToken = this.getCSRFToken(); // Fetch CSRF token from cookies
    const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || '', // Attach CSRF token
    });

    return this.http.post(`${this.apiUrl}/password-reset-request/`, { email }, { headers })
        .pipe(catchError((error) => throwError(error)));
  }

  // Reset password
  resetPassword(uid: string, token: string, newPassword: string): Observable<any> {
    const csrfToken = this.getCSRFToken(); // Fetch CSRF token if needed
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken || '',
    });

    return this.http.post(`${this.apiUrl}/password-reset-confirm/${uid}/${token}`, { new_password: newPassword }, { headers })
      .pipe(catchError((error) => throwError(error)));
  }
}



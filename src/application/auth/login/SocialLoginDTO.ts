// src/application/auth/login/SocialLoginDTO.ts
export interface SocialLoginInputDTO {
  credential: string;
  firstName?: string;
  lastName?: string;
}

export interface SocialLoginResponseDTO {
  accessToken: string;
  personId: number;
  userName: string;
}

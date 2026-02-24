// src/application/auth/login/SocialLoginDTO.ts
export interface SocialLoginInputDTO {
  credential: string;
}

export interface SocialLoginResponseDTO {
  accessToken: string;
  personId: number;
  userName: string;
}

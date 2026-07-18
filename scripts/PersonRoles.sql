model Person {
  pid                    Int                      @id @default(autoincrement())
  userName               String                   @db.VarChar(25)
  emailAddress           String                   @db.VarChar(75)
  passwordHash           String?                  @db.VarChar(255)
  firstName              String                   @db.VarChar(25)
  lastName               String                   @db.VarChar(35)
  emailVerified          Boolean                  @default(false)
  verifiedAt             DateTime?                @db.DateTime(0)
  rid                    Int?
  isActive               Boolean?                 @default(true)
  createdAt              DateTime?                @default(now()) @db.DateTime(0)
  updatedAt              DateTime?                @default(now()) @db.DateTime(0)
  lastLoginAt            DateTime?                @db.DateTime(0)
  EmailVerificationToken EmailVerificationToken[]
  PasswordResetToken     PasswordResetToken[]
  PersonIdentity         PersonIdentity[]
  refreshTokens          RefreshToken[]
}

model Roles {
  rid         Int       @id @default(autoincrement())
  roleName    String    @unique(map: "roleName") @db.VarChar(25)
  description String?   @db.VarChar(100)
  isActive    Boolean?  @default(true)
  createdAt   DateTime? @default(now()) @db.Timestamp(0)
  updatedAt   DateTime? @default(now()) @db.Timestamp(0)
}



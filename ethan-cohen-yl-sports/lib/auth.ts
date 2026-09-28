import { SignJWT, jwtVerify } from "jose";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET!);
export async function makeAdminToken(){return new SignJWT({role:"admin"}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(key())}
export async function verifyAdminToken(token?:string){if(!token)return false;try{const {payload}=await jwtVerify(token,key());return payload.role==="admin"}catch{return false}}
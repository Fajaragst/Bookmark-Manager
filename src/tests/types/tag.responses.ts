import { ErrorResponse, PaginationResponse } from "./common.responses";

export interface TagData{
    id: number;
    userId: number;
    name: string;
    description?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TagDetailResponse {
    message?: string;
    data?: TagData;
    error?: ErrorResponse;
}


export interface TagListResponse {
    message?: string;
    data?: {
        items?: Array<TagData>;
        pagination?: PaginationResponse;
    };
    error?: ErrorResponse;
}

import mongoose, { Schema, Document } from "mongoose";

// Organization types
export type OrganizationType = "company" | "school" | "team" | "personal";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  type: OrganizationType;
  description?: string;
  logo?: string;
  settings: {
    allowPublicDocuments: boolean;
    defaultMemberRole: string;
    maxStorageBytes: number;
    maxDocuments: number;
  };
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["company", "school", "team", "personal"],
      default: "team",
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    settings: {
      allowPublicDocuments: {
        type: Boolean,
        default: false,
      },
      defaultMemberRole: {
        type: String,
        default: "member",
      },
      maxStorageBytes: {
        type: Number,
        default: 1024 * 1024 * 1024 * 10, // 10GB default
      },
      maxDocuments: {
        type: Number,
        default: 1000,
      },
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (slug index is created automatically via unique: true)
OrganizationSchema.index({ ownerId: 1 });

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);


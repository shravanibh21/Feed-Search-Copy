import {defineField, defineType, Slug} from 'sanity'
import { Reference, checkDuplicateRefs, CustomValidationContext, validateUniqueSlug } from './tile.js';

export const subtile = defineType({
    name: 'subtile',
    title: 'Subtile',
    type: 'document',

    fields: [
        defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
            validation: Rule => Rule.required().error("Title is required")
        }),

        defineField({
            name: 'slug',
            type: 'slug',
            title: 'Slug',
            options: {source: (doc) => `${doc.title}`, maxLength: 100},
    
            validation: (Rule: any) =>
              Rule.required().custom(async (slug: {_type: string, current: string} | undefined, context: CustomValidationContext) => {
                if(slug === undefined) return 'Invalid slug';
                return validateUniqueSlug(slug.current, context);
              }),
            hidden: ({document}) => !document?.title, //only show when title field has value
    
        }),

        defineField({
            name: 'publishingDate',
            title: 'Publish Date',
            type: 'datetime',
            validation: (Rule: any) => Rule.required().custom((publishDate: string) => {
              const currentDate = new Date();
              const publishDateObj = new Date(publishDate);
              if (publishDateObj.getTime() > currentDate.getTime()) {
                return 'Publishing date cannot be later than the current date and time';
              }
              return true;
        
              }),
            initialValue: () => new Date().toISOString().split('T')[0], //validate date
        }),

        defineField({
            name: 'authors',
            title: 'Authors',
            type: 'array', 
            of: [{type: 'reference',
                  to: [{type: 'author'}],
            }],
            validation: (Rule: any) =>
              Rule.custom((authors: Reference[]) => {
                if(Array.isArray(authors)) {
                  return checkDuplicateRefs(authors);
                }
                return true;

              }), 
    
        }),

        defineField({
            name: 'summary',
            type: 'text',
            rows: 3,
            validation: (Rule: any) => [
              Rule.required().error("Summary is required"),
              Rule.max(1000).error('Summaries should be less than 1000 characters'),
            ]
        }),
    
    ]
  });
import {defineField, defineType, Slug} from 'sanity'
import { CustomValidationContext, validateUniqueSlug } from './tile';

export const author = defineType({
    name: 'author',
    title: 'Author',
    type: 'document',

    fields: [
      defineField({
        name: 'name',
        title: 'Name',
        type: 'string',
        validation: (Rule: any) => Rule.required().error("Name of the author is required")
      }),

      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: {
        source: 'name',
        maxLength: 100,
        },

        validation: (Rule: any) =>
          Rule.required().custom(async (slug: {_type: string, current: string} | undefined, context: CustomValidationContext) => {
            if(slug === undefined) return 'Invalid slug';
            return validateUniqueSlug(slug.current, context);
        }),
        hidden: ({document}) => !document?.name, //only show when title field has value
      }),
        
      defineField({
        name: 'picture',
        title: 'Profile Picture',
        type: 'image',
    }),
    ]
  });

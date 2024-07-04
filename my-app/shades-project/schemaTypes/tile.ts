//Can add drop down options using options, can validation rules to throw custom errors, initial value
import {defineField, defineType } from 'sanity'
import { sanClient } from '../client.js';


export interface Reference {
  _ref: string;
}

export interface CustomValidationContext {
  document: {
    _id: string;
  };
}

export const validateUniqueSlug = async (slug: string | undefined, context: CustomValidationContext) => {
  if (!slug) {
    return 'Slug is required';
  }

  const query = `count(*[(_type == 'author' || _type == 'tile' || _type == 'subtile') && (slug.current == $slug && _id != $docId)])`;
  let docId = context.document._id;
  if (docId.includes('drafts.')) {
    docId = docId.slice(7); //removes the "drafts." in the beginning to work with query
  }

  const params = { slug, docId: docId };
  const count = await sanClient.fetch(query, params);

  if (count > 0) return 'Slug must be unique across all document types';

  return true;
};

export const checkDuplicateRefs = async (refs: Reference[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const ref of refs) {
    if (seen.has(ref._ref)) {
      duplicates.add(ref._ref);
    } else {
      seen.add(ref._ref);
    }
  }

  if (duplicates.size > 0) {
    return `Duplicate references found`;
  }

  return true;
}

const toTitleCase = (str: string): string => {
  return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
}


export const tile = defineType({
  name: 'tile',
  title: 'Tile',
  type: 'document',

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    validation: (Rule: any) => [
        Rule.required()
          .custom((title: string) => {
            if (!title) 
                return 'Please enter a valid input' //enforce non empty string
            if (title.length >= 25) 
                return 'Titles should be 24 characters or shorter.' //enforce lengths
            if(title !== toTitleCase(title)) 
                return 'Titles must be in title case, first letter of each word capitalized.' //enforce title case

            return true
          }),
      ]

    }),

    defineField({
        name: 'slug',
        type: 'slug',
        title: 'Slug',
        options: {source: 'title', maxLength: 100},

        validation: (Rule: any) =>
          Rule.required().custom(async (slug: {_type: string, current: string} | undefined, context: CustomValidationContext) => {
            if(slug === undefined) return 'Invalid slug';
            return validateUniqueSlug(slug.current, context);
        }),
        hidden: ({document}) => !document?.title, //only show when title field has value

    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Shaded', value: 'shaded' },
          { title: 'Developing', value: 'developing' },

        ],
        layout: 'dropdown',
      },
      validation: (Rule: any) => Rule.required().error('Category is required'),
      initialValue: 'shaded',
    }),

    defineField({
        name: 'emoji',
        title: 'Image',
        type: 'image',
    }),

  defineField({
    name: 'publishingDate',
    title: 'First Published At',
    type: 'datetime',
    validation: (Rule: any) => Rule.required().custom((publishingDate: string) => {
      const currentDate = new Date();
      const publishDateObj = new Date(publishingDate);
      if (publishDateObj.getTime() > currentDate.getTime()) {
        return 'Publishing date cannot be later than the current date and time';
      }
      return true;
    }),

  }),

  defineField({
    name: 'updateDate',
    title: 'Last Update Published At',
    type: 'datetime',
    validation: (Rule: any) =>
      Rule.required().custom((updateDate: string, context: { document: { publishingDate: string } }) => {
        const publishingDate = new Date(context.document.publishingDate);
        const currentDate = new Date();
        const updateDateObj = new Date(updateDate);

        // Function to clear milliseconds
        const clearMilliseconds = (date: Date) => new Date(date.setMilliseconds(0));

        // Check if the updateDate is before or same as the publishingDate
        if (clearMilliseconds(updateDateObj).getTime() < clearMilliseconds(publishingDate).getTime()) {
          return 'Update date must be later than or same as publish date';
        }

        // Check if the updateDate is not later than the current date and time
        if (clearMilliseconds(updateDateObj).getTime() > clearMilliseconds(currentDate).getTime()) {
          return 'Update date cannot be later than the current date and time';
        }

        return true;
      }),

  }),

    defineField({
        name: 'authors',
        title: 'Authors',
        type: 'array', 
        of: [{type: 'reference',
              to: [{type: 'author'}],
        }],
        initialValue: [],
        validation: (Rule: any) =>
          Rule.custom((authors: Reference[]) => {
            if(Array.isArray(authors)) {
              return checkDuplicateRefs(authors);
            }
            return true;

        }),    

    }),

    defineField({
        name: 'subtiles',
        title: 'Subtiles',
        type: 'array', 
        of: [{type: 'reference',
              to: [{type: 'subtile'}],
        }],
        
        validation: (Rule: any) =>
            Rule.custom(async (subtiles: Reference[]) => {
              const publishedRefs = await sanClient.fetch(`count(*[_id in $ids])`, {
                ids: subtiles?.map((subtile: Reference) => subtile._ref) || [],
              });
              if(publishedRefs <= 0) return 'You must reference at least one published subtile';
              
              return checkDuplicateRefs(subtiles); 
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
    
    defineField({
      name: 'liked',
      type: 'boolean',
      initialValue: false,
      hidden: true,
    }),

    defineField({
      name: 'tags',
      type: 'array',
      of: [{type: 'string'}],
      validation: (Rule) => Rule.custom((tags: string[] | undefined) => {
        if (!Array.isArray(tags)) {
          return 'At least one tag required'
        }
        
        const lowerTags = tags.map(tag => tag.toLocaleLowerCase());
        const duplicates = lowerTags.filter((item, index) => lowerTags.indexOf(item) !== index)
        if (duplicates.length > 0) {
          return `Duplicate values found: ${duplicates.join(', ')}`
        }

        const tagsWithSpaces = tags.filter((tag) => tag.includes(' '));
        if (tagsWithSpaces.length > 0) {
          return `Tags cannot contain spaces: ${tagsWithSpaces.join(', ')}`;
        }

        const blankTags = tags.filter((tag) => tag.length === 0);
        if(blankTags.length > 0) return 'Remove all empty tags';

        return true
      }),
    }),

    defineField({
      name: 'score',
      type: 'number',
      initialValue: 0,
      hidden: true
    })

  ],
});


/** Facts about the author and the site that are not editorial content. */

export const site = {
  author: "Mujahid Sajjad",
  fullName: "Prof. Syed Mujahid Sajjad",
  title: "Urdu Poet, Writer & Associate Professor of English",
  affiliation: "Govt. Graduate College Burewala, Government of the Punjab",
  portrait: "/images/author.jpeg",
  whatsapp: "https://wa.me/923006993551",
  whatsappNumber: "0300 6993551",
  description:
    "Welcome to the official digital library and archive of Prof. Mujahid Sajjad Associate Professor of English (GGC Burewala), Urdu Poet, and Author. Access all published works online or download free PDF editions",
} as const;

export const navLinks = [
  { to: "/", label: "Home" },
  { to: "/books", label: "Books" },
  { to: "/poems", label: "Verses" },
  { to: "/videos", label: "Videos" },
  { to: "/about", label: "About" },
] as const;
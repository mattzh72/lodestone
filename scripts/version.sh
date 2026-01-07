sed -i -E "s~https://unpkg\.com/@mattzh72/lodestone@[0-9a-z\.-]+~https://unpkg.com/@mattzh72/lodestone@"$npm_package_version"~" README.md
git add README.md

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  templateUrl: './new-route.component.html',
  styleUrls: ['./new-route.component.css']
})
export class NewRouteComponent implements OnInit {
  persistence = {
    options:
      [
        {displayName: 'Google Drive', key: 'drive'},
        {displayName: 'Browser', key: 'browser'},
        {displayName: 'File system', key: 'files'}
      ],
    selected: -1
  };
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
  }

  selectPersistence(selectedIndex: number) {
    this.persistence.selected = selectedIndex;
    // TODO:
    //  await this.appState.setupPersistence;
    this.router.navigate(['import']);

  }

}
